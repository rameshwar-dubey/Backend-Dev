const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const Beneficiary = require("../models/Beneficiary");

const { requireAuth } = require("../middleware/requireAuth");
const { validate } = require("../middleware/validate");
const {
  transferLimiter,
  billPayLimiter,
  readLimiter,
} = require("../middleware/rateLimiters");
const {
  requireStepUp2FAIfHighValue,
  HIGH_VALUE_THRESHOLD_CENTS,
} = require("../middleware/requireStepUp2FA");
const { sanitizePlainText, escapeForEmail } = require("../utils/sanitizers");
const { writeAudit } = require("../services/audit");
const { sendEmail } = require("../services/email");
const { computeFraudIndicators } = require("../services/fraud");
const { getConfig } = require("../config/env");

const router = express.Router();

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Initiate a transfer: creates a PENDING transaction requiring confirmation.
const initiateTransferSchema = z.object({
  body: z.object({
    fromAccountId: z.string().min(1).max(64),
    toAccountId: z.string().min(1).max(64).optional(),
    beneficiaryId: z.string().min(1).max(64).optional(),
    amountCents: z.number().int().min(1).max(2_500_000_00),
    description: z.string().max(256).optional(),
  }),
});

router.post(
  "/transfer/initiate",
  requireAuth,
  transferLimiter,
  validate(initiateTransferSchema),
  async (req, res, next) => {
    try {
      const {
        fromAccountId,
        toAccountId,
        beneficiaryId,
        amountCents,
        description,
      } = req.validated.body;

      if ((toAccountId && beneficiaryId) || (!toAccountId && !beneficiaryId)) {
        return res.status(400).json({ error: "ValidationError" });
      }

      const from = await Account.findOne({
        _id: fromAccountId,
        userId: req.user._id,
      }).select("_id balanceCents status");
      if (!from) return res.status(404).json({ error: "NotFound" });
      if (from.status !== "active")
        return res.status(403).json({ error: "AccountNotActive" });

      // Prevent amount manipulation: enforce server-side limits.
      if (amountCents <= 0)
        return res.status(400).json({ error: "ValidationError" });
      if (amountCents > 2_500_000_00)
        return res.status(400).json({ error: "LimitExceeded" });

      // For initiation, we only check that funds exist now (final check happens at confirm).
      if (from.balanceCents < amountCents)
        return res.status(400).json({ error: "InsufficientFunds" });

      let toAccount = null;
      let beneficiary = null;

      if (toAccountId) {
        toAccount = await Account.findById(toAccountId).select("_id status");
        if (!toAccount) return res.status(404).json({ error: "NotFound" });
        if (toAccount.status !== "active")
          return res.status(403).json({ error: "AccountNotActive" });
      } else {
        beneficiary = await Beneficiary.findOne({
          _id: beneficiaryId,
          userId: req.user._id,
        }).select("_id");
        if (!beneficiary) return res.status(404).json({ error: "NotFound" });
      }

      // Fraud indicators are computed on initiate.
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentCount = await Transaction.countDocuments({
        userId: req.user._id,
        createdAt: { $gte: oneMinuteAgo },
      });
      const fraudIndicators = computeFraudIndicators({
        amountCents,
        recentCountInMinute: recentCount,
      });

      const tx = await Transaction.create({
        userId: req.user._id,
        type: "transfer",
        fromAccountId: from._id,
        toAccountId: toAccount ? toAccount._id : undefined,
        amountCents,
        description: sanitizePlainText(description || "", { maxLen: 256 }),
        status: "pending",
        fraudIndicators,
      });

      await writeAudit({
        userId: req.user._id,
        action: "TRANSFER_INITIATED",
        req,
        meta: {
          transactionId: tx._id,
          amountCents,
          highValue: amountCents > HIGH_VALUE_THRESHOLD_CENTS,
        },
      });

      res
        .status(201)
        .json({
          transactionId: tx._id,
          status: tx.status,
          requires2FA: amountCents > HIGH_VALUE_THRESHOLD_CENTS,
        });
    } catch (err) {
      next(err);
    }
  },
);

// Confirm transfer: requires step-up 2FA for high value.
const confirmSchema = z.object({
  params: z.object({ transactionId: z.string().min(1).max(64) }),
  body: z.object({ amountCents: z.number().int().min(1) }),
});

router.post(
  "/transfer/:transactionId/confirm",
  requireAuth,
  transferLimiter,
  validate(confirmSchema),
  requireStepUp2FAIfHighValue,
  async (req, res, next) => {
    const mongoSession = await mongoose.startSession();
    try {
      const { transactionId } = req.validated.params;
      const { amountCents } = req.validated.body;

      await mongoSession.withTransaction(async () => {
        const tx = await Transaction.findOne({
          _id: transactionId,
          userId: req.user._id,
        }).session(mongoSession);
        if (!tx) {
          const err = new Error("NotFound");
          err.statusCode = 404;
          err.publicError = "NotFound";
          throw err;
        }
        if (tx.status !== "pending") {
          const err = new Error("BadState");
          err.statusCode = 409;
          err.publicError = "InvalidTransactionState";
          throw err;
        }

        // Prevent tampering: confirmation must match initiated amount.
        if (tx.amountCents !== amountCents) {
          const err = new Error("AmountMismatch");
          err.statusCode = 400;
          err.publicError = "AmountMismatch";
          throw err;
        }

        const from = await Account.findOne({
          _id: tx.fromAccountId,
          userId: req.user._id,
        }).session(mongoSession);
        if (!from) {
          const err = new Error("NotFound");
          err.statusCode = 404;
          err.publicError = "NotFound";
          throw err;
        }

        if (from.balanceCents < tx.amountCents) {
          tx.status = "rejected";
          await tx.save({ session: mongoSession });
          const err = new Error("InsufficientFunds");
          err.statusCode = 400;
          err.publicError = "InsufficientFunds";
          throw err;
        }

        from.balanceCents -= tx.amountCents;
        await from.save({ session: mongoSession });

        if (tx.toAccountId) {
          const to = await Account.findById(tx.toAccountId).session(
            mongoSession,
          );
          if (to) {
            to.balanceCents += tx.amountCents;
            await to.save({ session: mongoSession });
          }
        }

        tx.status = "completed";
        await tx.save({ session: mongoSession });

        await writeAudit({
          userId: req.user._id,
          action: "TRANSFER_CONFIRMED",
          req,
          meta: { transactionId: tx._id },
        });

        // Email notification with sanitized description (XSS safe)
        const config = getConfig();
        const safeDesc = escapeForEmail(tx.description);
        await sendEmail({
          to: req.user.email,
          from: config.emailFrom,
          subject: "QuickBank transfer completed",
          text: `Transfer completed. Amount: ${tx.amountCents} cents. Description: ${safeDesc}`,
        });

        res.json({ ok: true, status: tx.status });
      });
    } catch (err) {
      next(err);
    } finally {
      mongoSession.endSession();
    }
  },
);

// Bill pay: similar two-step flow.
const initiateBillSchema = z.object({
  body: z.object({
    fromAccountId: z.string().min(1).max(64),
    beneficiaryId: z.string().min(1).max(64),
    amountCents: z.number().int().min(1).max(500_000_00),
    description: z.string().max(256).optional(),
  }),
});

router.post(
  "/billpay/initiate",
  requireAuth,
  billPayLimiter,
  validate(initiateBillSchema),
  async (req, res, next) => {
    try {
      const { fromAccountId, beneficiaryId, amountCents, description } =
        req.validated.body;

      const from = await Account.findOne({
        _id: fromAccountId,
        userId: req.user._id,
      }).select("_id balanceCents status");
      if (!from) return res.status(404).json({ error: "NotFound" });
      if (from.status !== "active")
        return res.status(403).json({ error: "AccountNotActive" });

      const beneficiary = await Beneficiary.findOne({
        _id: beneficiaryId,
        userId: req.user._id,
      }).select("_id");
      if (!beneficiary) return res.status(404).json({ error: "NotFound" });

      if (from.balanceCents < amountCents)
        return res.status(400).json({ error: "InsufficientFunds" });

      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentCount = await Transaction.countDocuments({
        userId: req.user._id,
        createdAt: { $gte: oneMinuteAgo },
      });
      const fraudIndicators = computeFraudIndicators({
        amountCents,
        recentCountInMinute: recentCount,
      });

      const tx = await Transaction.create({
        userId: req.user._id,
        type: "billpay",
        fromAccountId: from._id,
        amountCents,
        description: sanitizePlainText(description || "", { maxLen: 256 }),
        status: "pending",
        fraudIndicators,
      });

      await writeAudit({
        userId: req.user._id,
        action: "BILLPAY_INITIATED",
        req,
        meta: { transactionId: tx._id, amountCents },
      });

      res
        .status(201)
        .json({
          transactionId: tx._id,
          status: tx.status,
          requires2FA: amountCents > HIGH_VALUE_THRESHOLD_CENTS,
        });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/billpay/:transactionId/confirm",
  requireAuth,
  billPayLimiter,
  validate(confirmSchema),
  requireStepUp2FAIfHighValue,
  async (req, res, next) => {
    const mongoSession = await mongoose.startSession();
    try {
      const { transactionId } = req.validated.params;
      const { amountCents } = req.validated.body;

      await mongoSession.withTransaction(async () => {
        const tx = await Transaction.findOne({
          _id: transactionId,
          userId: req.user._id,
        }).session(mongoSession);
        if (!tx) {
          const err = new Error("NotFound");
          err.statusCode = 404;
          err.publicError = "NotFound";
          throw err;
        }
        if (tx.status !== "pending") {
          const err = new Error("BadState");
          err.statusCode = 409;
          err.publicError = "InvalidTransactionState";
          throw err;
        }
        if (tx.amountCents !== amountCents) {
          const err = new Error("AmountMismatch");
          err.statusCode = 400;
          err.publicError = "AmountMismatch";
          throw err;
        }

        const from = await Account.findOne({
          _id: tx.fromAccountId,
          userId: req.user._id,
        }).session(mongoSession);
        if (!from) {
          const err = new Error("NotFound");
          err.statusCode = 404;
          err.publicError = "NotFound";
          throw err;
        }

        if (from.balanceCents < tx.amountCents) {
          tx.status = "rejected";
          await tx.save({ session: mongoSession });
          const err = new Error("InsufficientFunds");
          err.statusCode = 400;
          err.publicError = "InsufficientFunds";
          throw err;
        }

        from.balanceCents -= tx.amountCents;
        await from.save({ session: mongoSession });

        tx.status = "completed";
        await tx.save({ session: mongoSession });

        await writeAudit({
          userId: req.user._id,
          action: "BILLPAY_CONFIRMED",
          req,
          meta: { transactionId: tx._id },
        });

        const config = getConfig();
        const safeDesc = escapeForEmail(tx.description);
        await sendEmail({
          to: req.user.email,
          from: config.emailFrom,
          subject: "QuickBank bill payment completed",
          text: `Bill payment completed. Amount: ${tx.amountCents} cents. Description: ${safeDesc}`,
        });

        res.json({ ok: true, status: tx.status });
      });
    } catch (err) {
      next(err);
    } finally {
      mongoSession.endSession();
    }
  },
);

// Transaction history with strict user scoping and safe search.
const historySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    type: z.enum(["transfer", "billpay"]).optional(),
    search: z.string().max(64).optional(),
  }),
});

router.get(
  "/",
  requireAuth,
  readLimiter,
  validate(historySchema),
  async (req, res, next) => {
    try {
      const { limit, type, search } = req.validated.query;
      const lim = Math.min(Math.max(Number(limit || 20), 1), 100);

      const q = { userId: req.user._id };
      if (type) q.type = type;

      if (search) {
        const safe = escapeRegex(sanitizePlainText(search, { maxLen: 64 }));
        q.description = { $regex: safe, $options: "i" };
      }

      const txs = await Transaction.find(q)
        .select(
          "_id type fromAccountId toAccountId amountCents currency description status createdAt fraudIndicators",
        )
        .sort({ createdAt: -1 })
        .limit(lim);

      res.json({ transactions: txs });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

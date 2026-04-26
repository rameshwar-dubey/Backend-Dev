const express = require("express");
const { z } = require("zod");

const LoanRequest = require("../models/LoanRequest");
const { requireAuth } = require("../middleware/requireAuth");
const { validate } = require("../middleware/validate");
const { sanitizePlainText } = require("../utils/sanitizers");
const { writeAudit } = require("../services/audit");

const router = express.Router();

const requestSchema = z.object({
  body: z.object({
    amountCents: z.number().int().min(1).max(50_000_00),
    termMonths: z.number().int().min(1).max(360),
    purpose: z.string().max(200).optional(),
  }),
});

router.post(
  "/request",
  requireAuth,
  validate(requestSchema),
  async (req, res, next) => {
    try {
      const { amountCents, termMonths, purpose } = req.validated.body;

      const loan = await LoanRequest.create({
        userId: req.user._id,
        amountCents,
        termMonths,
        purpose: sanitizePlainText(purpose || "", { maxLen: 200 }),
      });

      await writeAudit({
        userId: req.user._id,
        action: "LOAN_REQUESTED",
        req,
        meta: { loanId: loan._id, amountCents, termMonths },
      });

      res.status(201).json({ loanId: loan._id, status: loan.status });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const loans = await LoanRequest.find({ userId: req.user._id })
      .select("_id amountCents termMonths purpose status createdAt")
      .sort({ createdAt: -1 });

    res.json({ loans });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

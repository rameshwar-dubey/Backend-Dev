const express = require("express");
const { z } = require("zod");

const Account = require("../models/Account");
const User = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");
const { validate } = require("../middleware/validate");
const { sanitizePlainText } = require("../utils/sanitizers");
const { writeAudit } = require("../services/audit");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const accounts = await Account.find({ userId: req.user._id })
      .select("_id accountNumberLast4 balanceCents currency status createdAt")
      .sort({ createdAt: -1 });

    res.json({ accounts });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:accountId/balance",
  requireAuth,
  validate(
    z.object({ params: z.object({ accountId: z.string().min(1).max(64) }) }),
  ),
  async (req, res, next) => {
    try {
      const { accountId } = req.validated.params;

      const account = await Account.findOne({
        _id: accountId,
        userId: req.user._id,
      }).select("_id balanceCents currency status accountNumberLast4");

      if (!account) return res.status(404).json({ error: "NotFound" });

      res.json({
        accountId: account._id,
        balanceCents: account.balanceCents,
        currency: account.currency,
        status: account.status,
        accountNumberMasked: `****${account.accountNumberLast4}`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Profile updates (sanitize + authz)
const profileSchema = z.object({
  body: z.object({
    name: z.string().max(100).optional(),
  }),
});

router.patch(
  "/profile",
  requireAuth,
  validate(profileSchema),
  async (req, res, next) => {
    try {
      const { name } = req.validated.body;

      if (typeof name === "string") {
        req.user.name = sanitizePlainText(name, { maxLen: 100 });
      }

      await req.user.save();

      await writeAudit({
        userId: req.user._id,
        action: "PROFILE_UPDATED",
        req,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// Account number lookups are intentionally not supported to prevent parameter tampering.
// Clients must use accountId returned from GET /accounts.

module.exports = router;

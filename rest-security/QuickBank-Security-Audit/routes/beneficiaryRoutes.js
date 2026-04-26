const express = require("express");
const { z } = require("zod");

const Beneficiary = require("../models/Beneficiary");
const { requireAuth } = require("../middleware/requireAuth");
const { validate } = require("../middleware/validate");
const { sanitizePlainText } = require("../utils/sanitizers");
const { getConfig } = require("../config/env");
const { getKeyFromBase64, encryptString } = require("../utils/crypto");
const { writeAudit } = require("../services/audit");

const router = express.Router();

function normalizeAccountNumber(raw) {
  return String(raw).replace(/\s+/g, "");
}

const addSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    nickname: z.string().max(80).optional(),
    accountNumber: z.string().min(8).max(34),
  }),
});

router.post("/", requireAuth, validate(addSchema), async (req, res, next) => {
  try {
    const { name, nickname, accountNumber } = req.validated.body;
    const normalized = normalizeAccountNumber(accountNumber);

    if (!/^[0-9]{8,34}$/.test(normalized)) {
      return res.status(400).json({ error: "ValidationError" });
    }

    const key = getKeyFromBase64(getConfig().dataEncryptionKeyBase64);
    const accountNumberEnc = encryptString(normalized, key);
    const accountNumberLast4 = normalized.slice(-4);

    const beneficiary = await Beneficiary.create({
      userId: req.user._id,
      name: sanitizePlainText(name, { maxLen: 80 }),
      nickname: sanitizePlainText(nickname || "", { maxLen: 80 }),
      accountNumberEnc,
      accountNumberLast4,
    });

    await writeAudit({
      userId: req.user._id,
      action: "BENEFICIARY_CREATED",
      req,
      meta: { beneficiaryId: beneficiary._id },
    });

    res.status(201).json({
      beneficiary: {
        id: beneficiary._id,
        name: beneficiary.name,
        nickname: beneficiary.nickname,
        accountNumberMasked: `****${beneficiary.accountNumberLast4}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const list = await Beneficiary.find({ userId: req.user._id })
      .select("_id name nickname accountNumberLast4 createdAt")
      .sort({ createdAt: -1 });

    res.json({
      beneficiaries: list.map((b) => ({
        id: b._id,
        name: b.name,
        nickname: b.nickname,
        accountNumberMasked: `****${b.accountNumberLast4}`,
        createdAt: b.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/:beneficiaryId",
  requireAuth,
  validate(
    z.object({
      params: z.object({ beneficiaryId: z.string().min(1).max(64) }),
    }),
  ),
  async (req, res, next) => {
    try {
      const { beneficiaryId } = req.validated.params;
      const deleted = await Beneficiary.deleteOne({
        _id: beneficiaryId,
        userId: req.user._id,
      });
      if (deleted.deletedCount === 0)
        return res.status(404).json({ error: "NotFound" });

      await writeAudit({
        userId: req.user._id,
        action: "BENEFICIARY_DELETED",
        req,
        meta: { beneficiaryId },
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

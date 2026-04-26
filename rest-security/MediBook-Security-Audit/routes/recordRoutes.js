const express = require("express");
const { z } = require("zod");

const MedicalRecord = require("../models/MedicalRecord");
const { Roles } = require("../models/User");
const {
  requireAuth,
  attachCurrentUser,
  requireRole,
} = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { audit } = require("../middleware/audit");
const { sanitizeMedicalText } = require("../utils/sanitizers");
const { encryptString, decryptString } = require("../utils/crypto");

const router = express.Router();

const createSchema = z.object({
  patientUserId: z.string().min(1),
  content: z.string().min(1).max(8000),
});

router.post(
  "/",
  requireAuth,
  attachCurrentUser,
  requireRole([Roles.Doctor, Roles.Nurse, Roles.Admin]),
  validateBody(createSchema),
  async (req, res) => {
    const record = await MedicalRecord.create({
      patientUserId: req.body.patientUserId,
      createdByUserId: req.session.userId,
      contentEnc: encryptString(
        sanitizeMedicalText(req.body.content, { maxLen: 8000 }),
      ),
    });

    res.status(201).json({ id: String(record._id) });
  },
);

router.get(
  "/:id",
  requireAuth,
  attachCurrentUser,
  audit("MedicalRecord.Read", {
    resourceType: "MedicalRecord",
    getResourceId: (req) => req.params.id,
  }),
  async (req, res) => {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "NotFound" });

    const role = req.currentUser?.role;
    const isPatientOwner =
      role === Roles.Patient &&
      String(record.patientUserId) === String(req.session.userId);
    const isPrivileged =
      role === Roles.Doctor || role === Roles.Nurse || role === Roles.Admin;

    if (!isPatientOwner && !isPrivileged)
      return res.status(403).json({ error: "Forbidden" });

    res.json({
      id: String(record._id),
      patientUserId: String(record.patientUserId),
      content: decryptString(record.contentEnc),
      createdAt: record.createdAt,
    });
  },
);

module.exports = router;

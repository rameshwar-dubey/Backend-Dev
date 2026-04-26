const express = require("express");
const path = require("path");
const multer = require("multer");

const Document = require("../models/Document");
const { Roles } = require("../models/User");
const { requireAuth, attachCurrentUser } = require("../middleware/auth");
const { audit } = require("../middleware/audit");
const {
  validateAndPersistEncryptedUpload,
  readAndDecrypt,
  scanForMalwareOrThrow,
} = require("../services/uploads");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const storageDir = path.join(__dirname, "..", "storage");

router.post(
  "/patient/:patientUserId",
  requireAuth,
  attachCurrentUser,
  audit("Document.Upload", {
    resourceType: "Document",
    getPatientId: (req) => req.params.patientUserId,
  }),
  upload.single("file"),
  async (req, res) => {
    const role = req.currentUser?.role;
    const isPatientOwner =
      role === Roles.Patient &&
      req.params.patientUserId === String(req.session.userId);
    const isPrivileged =
      role === Roles.Doctor || role === Roles.Nurse || role === Roles.Admin;

    if (!isPatientOwner && !isPrivileged)
      return res.status(403).json({ error: "Forbidden" });

    const maxBytes = Number.parseInt(
      process.env.MAX_UPLOAD_BYTES || "10485760",
      10,
    );
    const persisted = await validateAndPersistEncryptedUpload({
      buffer: req.file?.buffer,
      originalName: req.file?.originalname,
      storageDir,
      maxBytes: Number.isFinite(maxBytes) ? maxBytes : 10485760,
    });

    const ciphertextPath = path.join(storageDir, persisted.storedName);
    await scanForMalwareOrThrow(ciphertextPath);

    const doc = await Document.create({
      patientUserId: req.params.patientUserId,
      uploadedByUserId: req.session.userId,
      storedName: persisted.storedName,
      originalName: persisted.originalName,
      mime: persisted.mime,
      size: persisted.size,
      ivB64: persisted.ivB64,
      tagB64: persisted.tagB64,
    });

    res.status(201).json({ id: String(doc._id) });
  },
);

router.get(
  "/:id",
  requireAuth,
  attachCurrentUser,
  audit("Document.Download", {
    resourceType: "Document",
    getResourceId: (req) => req.params.id,
  }),
  async (req, res) => {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "NotFound" });

    const role = req.currentUser?.role;
    const isPatientOwner =
      role === Roles.Patient &&
      String(doc.patientUserId) === String(req.session.userId);
    const isPrivileged =
      role === Roles.Doctor || role === Roles.Nurse || role === Roles.Admin;
    const isInsurance = role === Roles.Insurance;

    // Insurance role should not access raw medical documents
    if (isInsurance) return res.status(403).json({ error: "Forbidden" });

    if (!isPatientOwner && !isPrivileged)
      return res.status(403).json({ error: "Forbidden" });

    const buffer = await readAndDecrypt({
      storageDir,
      storedName: doc.storedName,
      ivB64: doc.ivB64,
      tagB64: doc.tagB64,
    });

    res.setHeader("Content-Type", doc.mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${doc.originalName}\"`,
    );
    return res.send(buffer);
  },
);

module.exports = router;

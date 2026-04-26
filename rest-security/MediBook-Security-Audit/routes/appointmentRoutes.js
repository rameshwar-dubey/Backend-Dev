const express = require("express");
const { z } = require("zod");

const Appointment = require("../models/Appointment");
const { Roles } = require("../models/User");
const { validateBody } = require("../middleware/validate");
const {
  requireAuth,
  attachCurrentUser,
  requireRole,
} = require("../middleware/auth");
const {
  sanitizePlainText,
  sanitizeDoctorNotes,
  normalizeDateISO,
} = require("../utils/sanitizers");
const { encryptString, decryptString } = require("../utils/crypto");

const router = express.Router();

const createSchema = z.object({
  doctorUserId: z.string().min(1),
  scheduledDate: z.string().min(10).max(10),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(500).optional().default(""),
});

router.post(
  "/",
  requireAuth,
  attachCurrentUser,
  requireRole([Roles.Patient, Roles.Admin]),
  validateBody(createSchema),
  async (req, res) => {
    const dateIso = normalizeDateISO(req.body.scheduledDate);
    if (!dateIso) return res.status(400).json({ error: "InvalidDate" });

    const dt = new Date(`${dateIso}T${req.body.scheduledTime}:00.000Z`);
    if (Number.isNaN(dt.getTime()))
      return res.status(400).json({ error: "InvalidDateTime" });

    const appt = await Appointment.create({
      patientUserId: req.session.userId,
      doctorUserId: req.body.doctorUserId,
      scheduledAt: dt,
      reason: sanitizePlainText(req.body.reason, { maxLen: 500 }),
    });

    res.status(201).json({ id: String(appt._id) });
  },
);

// Doctor/Nurse can add notes/prescription to an appointment
const notesSchema = z.object({
  doctorNotes: z.string().max(8000).optional().default(""),
  prescription: z.string().max(8000).optional().default(""),
});

router.patch(
  "/:id/notes",
  requireAuth,
  attachCurrentUser,
  requireRole([Roles.Doctor, Roles.Nurse, Roles.Admin]),
  validateBody(notesSchema),
  async (req, res) => {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: "NotFound" });

    // Doctor must be the appointment doctor (unless Admin/Nurse policy differs)
    if (
      req.currentUser.role === Roles.Doctor &&
      String(appt.doctorUserId) !== String(req.session.userId)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    appt.doctorNotesEnc = req.body.doctorNotes
      ? encryptString(sanitizeDoctorNotes(req.body.doctorNotes))
      : appt.doctorNotesEnc;
    appt.prescriptionEnc = req.body.prescription
      ? encryptString(sanitizeDoctorNotes(req.body.prescription))
      : appt.prescriptionEnc;
    await appt.save();

    res.json({ ok: true });
  },
);

// Lookup appointment: patient sees their own; staff sees if assigned or admin
router.get("/:id", requireAuth, attachCurrentUser, async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: "NotFound" });

  const role = req.currentUser?.role;
  const isPatientOwner =
    role === Roles.Patient &&
    String(appt.patientUserId) === String(req.session.userId);
  const isDoctorOwner =
    role === Roles.Doctor &&
    String(appt.doctorUserId) === String(req.session.userId);
  const isPrivileged = role === Roles.Admin || role === Roles.Nurse;

  if (!isPatientOwner && !isDoctorOwner && !isPrivileged)
    return res.status(403).json({ error: "Forbidden" });

  res.json({
    id: String(appt._id),
    patientUserId: String(appt.patientUserId),
    doctorUserId: String(appt.doctorUserId),
    scheduledAt: appt.scheduledAt,
    reason: appt.reason,
    doctorNotes: appt.doctorNotesEnc ? decryptString(appt.doctorNotesEnc) : "",
    prescription: appt.prescriptionEnc
      ? decryptString(appt.prescriptionEnc)
      : "",
  });
});

module.exports = router;

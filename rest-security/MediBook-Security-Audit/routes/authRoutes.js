const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const validator = require("validator");

const { User, Roles } = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const DoctorProfile = require("../models/DoctorProfile");
const { validateBody } = require("../middleware/validate");
const { loginLimiter } = require("../middleware/rateLimiters");
const {
  normalizeEmail,
  normalizePhone,
  normalizeDateISO,
  normalizeSsn,
  sanitizePlainText,
  sanitizeMedicalText,
} = require("../utils/sanitizers");
const { encryptString } = require("../utils/crypto");

const router = express.Router();

function passwordMeetsRequirements(pw) {
  if (typeof pw !== "string") return false;
  if (pw.length < 12 || pw.length > 72) return false;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
  return hasLower && hasUpper && hasNumber && hasSymbol;
}

const registerPatientSchema = z.object({
  role: z.literal(Roles.Patient).default(Roles.Patient),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(25),
  password: z.string().min(12).max(72),
  dob: z.string().min(10).max(10),
  ssn: z.string().min(9).max(20).optional().default(""),
  insuranceDetails: z.string().max(2000).optional().default(""),
  medicalHistory: z.string().max(8000).optional().default(""),
});

router.post(
  "/register/patient",
  validateBody(registerPatientSchema),
  async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "InvalidEmail" });

    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: "InvalidPhone" });

    const dobIso = normalizeDateISO(req.body.dob);
    if (!dobIso) return res.status(400).json({ error: "InvalidDOB" });

    if (!passwordMeetsRequirements(req.body.password)) {
      return res.status(400).json({ error: "WeakPassword" });
    }

    const ssn = normalizeSsn(req.body.ssn);
    const passwordHash = await bcrypt.hash(req.body.password, 12);

    const user = await User.create({
      role: Roles.Patient,
      name: sanitizePlainText(req.body.name, { maxLen: 120 }),
      email,
      phone,
      passwordHash,
    });

    await PatientProfile.create({
      userId: user._id,
      dobIso,
      ssnEnc: ssn ? encryptString(ssn) : "",
      insuranceEnc: req.body.insuranceDetails
        ? encryptString(
            sanitizeMedicalText(req.body.insuranceDetails, { maxLen: 2000 }),
          )
        : "",
      medicalHistoryEnc: req.body.medicalHistory
        ? encryptString(
            sanitizeMedicalText(req.body.medicalHistory, { maxLen: 8000 }),
          )
        : "",
    });

    req.session.userId = String(user._id);
    res
      .status(201)
      .json({ id: String(user._id), role: user.role, email: user.email });
  },
);

const registerStaffSchema = z.object({
  role: z.enum([Roles.Doctor, Roles.Nurse, Roles.Admin, Roles.Insurance]),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(25),
  password: z.string().min(12).max(72),
  specialty: z.string().max(120).optional().default(""),
  clinic: z.string().max(120).optional().default(""),
});

router.post(
  "/register/staff",
  validateBody(registerStaffSchema),
  async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!email || !validator.isEmail(email))
      return res.status(400).json({ error: "InvalidEmail" });

    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: "InvalidPhone" });

    if (!passwordMeetsRequirements(req.body.password)) {
      return res.status(400).json({ error: "WeakPassword" });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);

    const user = await User.create({
      role: req.body.role,
      name: sanitizePlainText(req.body.name, { maxLen: 120 }),
      email,
      phone,
      passwordHash,
    });

    if (req.body.role === Roles.Doctor) {
      await DoctorProfile.create({
        userId: user._id,
        specialty: sanitizePlainText(req.body.specialty, { maxLen: 120 }),
        clinic: sanitizePlainText(req.body.clinic, { maxLen: 120 }),
      });
    }

    req.session.userId = String(user._id);
    res
      .status(201)
      .json({ id: String(user._id), role: user.role, email: user.email });
  },
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: "InvalidEmail" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "InvalidCredentials" });

    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "InvalidCredentials" });

    req.session.userId = String(user._id);
    res.json({ ok: true });
  },
);

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("medibook.sid");
    res.json({ ok: true });
  });
});

module.exports = router;

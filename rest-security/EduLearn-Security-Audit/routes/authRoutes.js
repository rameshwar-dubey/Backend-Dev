const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const validator = require("validator");

const { User, Roles } = require("../models/User");
const { validateBody } = require("../middleware/validate");
const { loginLimiter } = require("../middleware/rateLimiters");
const {
  sanitizeEmail,
  sanitizePlainText,
  sanitizeProfileText,
} = require("../utils/sanitizers");
const { createTotpSecret, verifyTotp } = require("../services/mfa");
const {
  requireAuth,
  attachCurrentUser,
  requireRole,
} = require("../middleware/auth");

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

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(12).max(72),
  role: z.enum([Roles.Student, Roles.Instructor]).default(Roles.Student),
  displayName: z.string().max(80).optional().default(""),
  bio: z.string().max(500).optional().default(""),
});

router.post("/register", validateBody(registerSchema), async (req, res) => {
  const email = sanitizeEmail(req.body.email);
  if (!email || !validator.isEmail(email))
    return res.status(400).json({ error: "InvalidEmail" });

  if (!passwordMeetsRequirements(req.body.password)) {
    return res.status(400).json({ error: "WeakPassword" });
  }

  const username = sanitizePlainText(req.body.username, { maxLen: 40 });
  const passwordHash = await bcrypt.hash(req.body.password, 12);

  const user = await User.create({
    username,
    email,
    passwordHash,
    role: req.body.role,
    profile: {
      displayName: sanitizeProfileText(req.body.displayName, { maxLen: 80 }),
      bio: sanitizeProfileText(req.body.bio, { maxLen: 500 }),
    },
  });

  req.session.userId = String(user._id);

  res.status(201).json({
    id: String(user._id),
    email: user.email,
    username: user.username,
    role: user.role,
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
  mfaToken: z.string().max(10).optional(),
});

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  async (req, res) => {
    const email = sanitizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: "InvalidEmail" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "InvalidCredentials" });

    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "InvalidCredentials" });

    if (user.role === Roles.Instructor && user.mfa?.enabled) {
      const token = req.body.mfaToken;
      if (!token) return res.status(401).json({ error: "MFARequired" });
      const valid = verifyTotp({ secretBase32: user.mfa.secretBase32, token });
      if (!valid) return res.status(401).json({ error: "InvalidMFA" });
    }

    req.session.userId = String(user._id);
    res.json({ ok: true });
  },
);

router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("edulearn.sid");
    res.json({ ok: true });
  });
});

// Instructor MFA enrollment
router.post(
  "/mfa/setup",
  requireAuth,
  attachCurrentUser,
  requireRole([Roles.Instructor]),
  async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: "NotFound" });

    const { base32, otpauthUrl } = createTotpSecret({
      accountName: user.email,
      issuer: "EduLearn",
    });

    user.mfa.secretBase32 = base32;
    user.mfa.enabled = false;
    await user.save();

    res.json({ secretBase32: base32, otpauthUrl });
  },
);

const mfaVerifySchema = z.object({ token: z.string().min(6).max(10) });
router.post(
  "/mfa/verify",
  requireAuth,
  attachCurrentUser,
  requireRole([Roles.Instructor]),
  validateBody(mfaVerifySchema),
  async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: "NotFound" });
    if (!user.mfa.secretBase32)
      return res.status(400).json({ error: "MFASetupRequired" });

    const valid = verifyTotp({
      secretBase32: user.mfa.secretBase32,
      token: req.body.token,
    });
    if (!valid) return res.status(400).json({ error: "InvalidMFA" });

    user.mfa.enabled = true;
    await user.save();

    res.json({ ok: true });
  },
);

module.exports = router;

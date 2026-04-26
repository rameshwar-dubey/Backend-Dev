const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const validator = require("validator");

const User = require("../models/User");
const { validateBody } = require("../middleware/validate");
const {
  sanitizeBio,
  sanitizeEmail,
  sanitizeProfileUrl,
  sanitizeUsername,
} = require("../utils/sanitizers");

const router = express.Router();

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  bio: z.string().max(500).optional().default(""),
  profileUrl: z.string().max(2048).optional().default(""),
  avatarUrl: z.string().max(2048).optional().default(""),
});

router.post("/register", validateBody(registerSchema), async (req, res) => {
  const username = sanitizeUsername(req.body.username);
  const email = sanitizeEmail(req.body.email);

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: "InvalidEmail" });
  }

  const bio = sanitizeBio(req.body.bio);
  const profileUrl = sanitizeProfileUrl(req.body.profileUrl);
  const avatarUrl = sanitizeProfileUrl(req.body.avatarUrl);

  const passwordHash = await bcrypt.hash(req.body.password, 12);

  const user = await User.create({
    username,
    email,
    passwordHash,
    bio,
    profileUrl,
    avatarUrl,
  });

  req.session.userId = String(user._id);

  return res.status(201).json({
    id: String(user._id),
    username: user.username,
    email: user.email,
    bio: user.bio,
    profileUrl: user.profileUrl,
    avatarUrl: user.avatarUrl,
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

router.post("/login", validateBody(loginSchema), async (req, res) => {
  const email = sanitizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: "InvalidEmail" });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "InvalidCredentials" });

  const ok = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "InvalidCredentials" });

  req.session.userId = String(user._id);
  return res.json({ ok: true });
});

router.post("/logout", async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connecthub.sid");
    res.json({ ok: true });
  });
});

module.exports = router;

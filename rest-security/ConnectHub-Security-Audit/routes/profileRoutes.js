const express = require("express");
const { z } = require("zod");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { sanitizeBio, sanitizeProfileUrl } = require("../utils/sanitizers");

const router = express.Router();

const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  profileUrl: z.string().max(2048).optional(),
  avatarUrl: z.string().max(2048).optional(),
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId).select(
    "username email bio profileUrl avatarUrl",
  );
  if (!user) return res.status(404).json({ error: "NotFound" });

  return res.json({
    id: String(user._id),
    username: user.username,
    email: user.email,
    bio: user.bio,
    profileUrl: user.profileUrl,
    avatarUrl: user.avatarUrl,
  });
});

router.patch(
  "/me",
  requireAuth,
  validateBody(updateProfileSchema),
  async (req, res) => {
    const update = {};
    if (typeof req.body.bio === "string")
      update.bio = sanitizeBio(req.body.bio);
    if (typeof req.body.profileUrl === "string")
      update.profileUrl = sanitizeProfileUrl(req.body.profileUrl);
    if (typeof req.body.avatarUrl === "string")
      update.avatarUrl = sanitizeProfileUrl(req.body.avatarUrl);

    const user = await User.findByIdAndUpdate(req.session.userId, update, {
      new: true,
    }).select("username email bio profileUrl avatarUrl");
    if (!user) return res.status(404).json({ error: "NotFound" });

    return res.json({
      id: String(user._id),
      username: user.username,
      email: user.email,
      bio: user.bio,
      profileUrl: user.profileUrl,
      avatarUrl: user.avatarUrl,
    });
  },
);

module.exports = router;

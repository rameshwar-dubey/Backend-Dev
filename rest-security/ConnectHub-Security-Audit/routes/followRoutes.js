const express = require("express");
const { z } = require("zod");

const Follow = require("../models/Follow");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");

const router = express.Router();

const followSchema = z.object({
  userId: z.string().min(1),
});

router.post(
  "/follow",
  requireAuth,
  validateBody(followSchema),
  async (req, res) => {
    await Follow.create({
      followerId: req.session.userId,
      followingId: req.body.userId,
    });
    return res.json({ ok: true });
  },
);

router.post(
  "/unfollow",
  requireAuth,
  validateBody(followSchema),
  async (req, res) => {
    await Follow.deleteOne({
      followerId: req.session.userId,
      followingId: req.body.userId,
    });
    return res.json({ ok: true });
  },
);

module.exports = router;

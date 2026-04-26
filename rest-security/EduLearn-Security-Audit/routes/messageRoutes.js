const express = require("express");
const { z } = require("zod");

const Message = require("../models/Message");
const { validateBody } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { sanitizePlainText } = require("../utils/sanitizers");

const router = express.Router();

const sendSchema = z.object({
  toUserId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

router.post("/", requireAuth, validateBody(sendSchema), async (req, res) => {
  const contentText = sanitizePlainText(req.body.content, { maxLen: 5000 });
  const msg = await Message.create({
    fromUserId: req.session.userId,
    toUserId: req.body.toUserId,
    contentText,
  });
  res.status(201).json({ id: String(msg._id) });
});

router.get("/inbox", requireAuth, async (req, res) => {
  const items = await Message.find({ toUserId: req.session.userId })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({
    items: items.map((m) => ({
      id: String(m._id),
      fromUserId: String(m.fromUserId),
      contentText: m.contentText,
      createdAt: m.createdAt,
    })),
  });
});

module.exports = router;

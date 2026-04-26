const express = require("express");
const { z } = require("zod");

const Message = require("../models/Message");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { sanitizePlainText } = require("../utils/sanitizers");

const router = express.Router();

const sendSchema = z.object({
  toUserId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

router.post("/", requireAuth, validateBody(sendSchema), async (req, res) => {
  const contentText = sanitizePlainText(req.body.content, { maxLen: 5000 });

  const message = await Message.create({
    fromUserId: req.session.userId,
    toUserId: req.body.toUserId,
    contentText,
  });

  return res.status(201).json({
    id: String(message._id),
    fromUserId: String(message.fromUserId),
    toUserId: String(message.toUserId),
    contentText: message.contentText,
    createdAt: message.createdAt,
  });
});

router.get("/inbox", requireAuth, async (req, res) => {
  const messages = await Message.find({ toUserId: req.session.userId })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json({
    items: messages.map((m) => ({
      id: String(m._id),
      fromUserId: String(m.fromUserId),
      toUserId: String(m.toUserId),
      contentText: m.contentText,
      createdAt: m.createdAt,
    })),
  });
});

module.exports = router;

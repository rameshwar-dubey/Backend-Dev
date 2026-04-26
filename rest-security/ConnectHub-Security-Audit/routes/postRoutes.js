const express = require("express");
const { z } = require("zod");

const Post = require("../models/Post");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { sanitizeLimitedPostHtml } = require("../utils/sanitizers");

const router = express.Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(10000),
});

router.post(
  "/",
  requireAuth,
  validateBody(createPostSchema),
  async (req, res) => {
    const contentHtml = sanitizeLimitedPostHtml(req.body.content);

    const post = await Post.create({
      authorId: req.session.userId,
      contentHtml,
    });

    res.status(201).json({
      id: String(post._id),
      authorId: String(post.authorId),
      contentHtml: post.contentHtml,
      createdAt: post.createdAt,
    });
  },
);

router.get("/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "NotFound" });

  return res.json({
    id: String(post._id),
    authorId: String(post.authorId),
    contentHtml: post.contentHtml,
    createdAt: post.createdAt,
  });
});

module.exports = router;

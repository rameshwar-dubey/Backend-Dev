const express = require("express");
const { z } = require("zod");

const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { validateBody } = require("../middleware/validate");
const {
  requireAuth,
  attachCurrentUser,
  requireRole,
} = require("../middleware/auth");
const {
  sanitizeCourseRichText,
  sanitizePlainText,
} = require("../utils/sanitizers");

const router = express.Router();

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(20000),
  isPremium: z.boolean().optional().default(false),
});

router.post(
  "/",
  requireAuth,
  attachCurrentUser,
  requireRole(["Instructor", "Admin"]),
  validateBody(createSchema),
  async (req, res) => {
    const course = await Course.create({
      instructorId: req.session.userId,
      title: sanitizePlainText(req.body.title, { maxLen: 120 }),
      descriptionHtml: sanitizeCourseRichText(req.body.description),
      isPremium: req.body.isPremium,
    });

    res.status(201).json({
      id: String(course._id),
      instructorId: String(course.instructorId),
      title: course.title,
      descriptionHtml: course.descriptionHtml,
      isPremium: course.isPremium,
    });
  },
);

// Instructor dashboard: only their courses (fixes cross-instructor content leak)
router.get(
  "/mine",
  requireAuth,
  attachCurrentUser,
  requireRole(["Instructor", "Admin"]),
  async (req, res) => {
    const filter =
      req.currentUser.role === "Admin"
        ? {}
        : { instructorId: req.session.userId };
    const items = await Course.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({
      items: items.map((c) => ({
        id: String(c._id),
        instructorId: String(c.instructorId),
        title: c.title,
        descriptionHtml: c.descriptionHtml,
        isPremium: c.isPremium,
      })),
    });
  },
);

const enrollSchema = z.object({ courseId: z.string().min(1) });
router.post(
  "/enroll",
  requireAuth,
  attachCurrentUser,
  requireRole(["Student", "Admin"]),
  validateBody(enrollSchema),
  async (req, res) => {
    await Enrollment.create({
      courseId: req.body.courseId,
      studentId: req.session.userId,
    });
    res.json({ ok: true });
  },
);

module.exports = router;

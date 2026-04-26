const express = require("express");
const { z } = require("zod");

const Quiz = require("../models/Quiz");
const Course = require("../models/Course");
const QuizSubmission = require("../models/QuizSubmission");
const Enrollment = require("../models/Enrollment");
const { validateBody } = require("../middleware/validate");
const {
  requireAuth,
  attachCurrentUser,
  requireRole,
} = require("../middleware/auth");
const { quizSubmitLimiter } = require("../middleware/rateLimiters");
const { sanitizePlainText } = require("../utils/sanitizers");

const router = express.Router();

const createQuizSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(120),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1).max(1000),
        choices: z.array(z.string().min(1).max(200)).min(2).max(10),
        correctIndex: z.number().int().min(0).max(9),
      }),
    )
    .min(1)
    .max(50),
});

router.post(
  "/",
  requireAuth,
  attachCurrentUser,
  requireRole(["Instructor", "Admin"]),
  validateBody(createQuizSchema),
  async (req, res) => {
    const course = await Course.findById(req.body.courseId);
    if (!course) return res.status(404).json({ error: "CourseNotFound" });

    // Non-admin instructors can only create for their own course
    if (
      req.currentUser.role !== "Admin" &&
      String(course.instructorId) !== String(req.session.userId)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const quiz = await Quiz.create({
      courseId: req.body.courseId,
      instructorId: req.session.userId,
      title: sanitizePlainText(req.body.title, { maxLen: 120 }),
      questions: req.body.questions.map((q) => ({
        prompt: sanitizePlainText(q.prompt, { maxLen: 1000 }),
        choices: q.choices.map((c) => sanitizePlainText(c, { maxLen: 200 })),
        correctIndex: q.correctIndex,
      })),
    });

    res.status(201).json({ id: String(quiz._id) });
  },
);

const submitSchema = z.object({
  quizId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(9)).min(1).max(50),
});

router.post(
  "/submit",
  requireAuth,
  attachCurrentUser,
  requireRole(["Student", "Admin"]),
  quizSubmitLimiter,
  validateBody(submitSchema),
  async (req, res) => {
    const quiz = await Quiz.findById(req.body.quizId);
    if (!quiz) return res.status(404).json({ error: "QuizNotFound" });

    const enrollment = await Enrollment.findOne({
      courseId: quiz.courseId,
      studentId: req.session.userId,
    });
    if (!enrollment && req.currentUser.role !== "Admin") {
      return res.status(403).json({ error: "NotEnrolled" });
    }

    // Prevent modifying answers after submission: unique index enforces 1 submission.
    // If you want multiple attempts, store attemptNumber and lock each attempt.
    if (req.body.answers.length !== quiz.questions.length) {
      return res.status(400).json({ error: "AnswerCountMismatch" });
    }

    let score = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      if (req.body.answers[i] === quiz.questions[i].correctIndex) score += 1;
    }

    try {
      const submission = await QuizSubmission.create({
        quizId: quiz._id,
        studentId: req.session.userId,
        answers: req.body.answers,
        submittedAt: new Date(),
        locked: true,
        score,
      });

      res.status(201).json({ id: String(submission._id), score });
    } catch (err) {
      // Duplicate key -> already submitted
      if (err && err.code === 11000) {
        return res.status(409).json({ error: "AlreadySubmitted" });
      }
      throw err;
    }
  },
);

module.exports = router;

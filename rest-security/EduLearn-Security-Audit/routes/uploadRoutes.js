const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs/promises");

const Material = require("../models/Material");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const {
  requireAuth,
  attachCurrentUser,
  requireRole,
} = require("../middleware/auth");
const {
  validateAndPersistUpload,
  scanForMalwareOrThrow,
} = require("../services/uploads");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/course/:courseId/material",
  requireAuth,
  attachCurrentUser,
  requireRole(["Instructor", "Admin"]),
  upload.single("file"),
  async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ error: "CourseNotFound" });

    if (
      req.currentUser.role !== "Admin" &&
      String(course.instructorId) !== String(req.session.userId)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const maxBytes = Number.parseInt(
      process.env.MAX_UPLOAD_BYTES || "10485760",
      10,
    );
    const persisted = await validateAndPersistUpload({
      buffer: req.file?.buffer,
      originalName: req.file?.originalname,
      uploadDir: path.join(__dirname, "..", "uploads"),
      maxBytes: Number.isFinite(maxBytes) ? maxBytes : 10485760,
    });

    const fullPath = path.join(
      __dirname,
      "..",
      "uploads",
      persisted.storedName,
    );
    await scanForMalwareOrThrow(fullPath);

    const material = await Material.create({
      courseId: course._id,
      uploadedByUserId: req.session.userId,
      storedName: persisted.storedName,
      originalName: persisted.originalName,
      mime: persisted.mime,
      size: persisted.size,
    });

    res.status(201).json({ id: String(material._id) });
  },
);

// Secure retrieval: only instructor (owner) or enrolled students
router.get(
  "/material/:id",
  requireAuth,
  attachCurrentUser,
  async (req, res) => {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ error: "NotFound" });

    const course = await Course.findById(material.courseId);
    if (!course) return res.status(404).json({ error: "CourseNotFound" });

    const isInstructorOwner =
      String(course.instructorId) === String(req.session.userId);
    const isAdmin = req.currentUser?.role === "Admin";
    const enrolled = await Enrollment.findOne({
      courseId: course._id,
      studentId: req.session.userId,
    });

    if (!isAdmin && !isInstructorOwner && !enrolled)
      return res.status(403).json({ error: "Forbidden" });

    const fullPath = path.join(__dirname, "..", "uploads", material.storedName);
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: "FileMissing" });
    }

    res.setHeader("Content-Type", material.mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${material.originalName}\"`,
    );
    return res.sendFile(fullPath);
  },
);

module.exports = router;

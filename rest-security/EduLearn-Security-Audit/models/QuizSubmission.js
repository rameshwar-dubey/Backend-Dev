const mongoose = require("mongoose");

const QuizSubmissionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    answers: [{ type: Number, required: true }],
    submittedAt: { type: Date, required: true },
    locked: { type: Boolean, default: true },
    score: { type: Number, default: 0 },
  },
  { timestamps: true },
);

QuizSubmissionSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("QuizSubmission", QuizSubmissionSchema);

const mongoose = require("mongoose");

const LoanRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amountCents: { type: Number, required: true, min: 1 },
    termMonths: { type: Number, required: true, min: 1, max: 360 },
    purpose: { type: String, default: "" },
    status: {
      type: String,
      enum: ["requested", "review", "approved", "rejected"],
      default: "requested",
    },
  },
  { timestamps: true },
);

LoanRequestSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("LoanRequest", LoanRequestSchema);

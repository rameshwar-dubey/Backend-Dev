const mongoose = require("mongoose");

const FraudIndicatorSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    score: { type: Number, required: true },
    details: { type: Object, default: {} },
  },
  { _id: false },
);

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: { type: String, enum: ["transfer", "billpay"], required: true },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },

    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "USD" },

    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "completed", "rejected"],
      default: "pending",
    },

    fraudIndicators: { type: [FraudIndicatorSchema], default: [] },
  },
  { timestamps: true },
);

TransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", TransactionSchema);

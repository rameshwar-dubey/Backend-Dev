const mongoose = require("mongoose");

const BeneficiarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    accountNumberEnc: { type: String, required: true },
    accountNumberLast4: { type: String, required: true },
    nickname: { type: String, default: "" },
  },
  { timestamps: true },
);

BeneficiarySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Beneficiary", BeneficiarySchema);

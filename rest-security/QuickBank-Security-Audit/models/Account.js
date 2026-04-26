const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Encrypted at rest (AES-GCM) using utils/crypto
    accountNumberEnc: { type: String, required: true },
    accountNumberLast4: { type: String, required: true },

    balanceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    status: { type: String, enum: ["active", "frozen"], default: "active" },
  },
  { timestamps: true },
);

AccountSchema.index({ userId: 1, accountNumberLast4: 1 });

module.exports = mongoose.model("Account", AccountSchema);

const mongoose = require("mongoose");

const PatientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    dobIso: { type: String, default: "" },

    // encrypted strings
    ssnEnc: { type: String, default: "" },
    insuranceEnc: { type: String, default: "" },
    medicalHistoryEnc: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PatientProfile", PatientProfileSchema);

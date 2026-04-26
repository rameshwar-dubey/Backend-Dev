const mongoose = require("mongoose");

const MedicalRecordSchema = new mongoose.Schema(
  {
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // encrypted blob of record content
    contentEnc: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MedicalRecord", MedicalRecordSchema);

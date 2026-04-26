const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    scheduledAt: { type: Date, required: true, index: true },
    reason: { type: String, default: "" },

    // encrypted doctor notes/prescription
    doctorNotesEnc: { type: String, default: "" },
    prescriptionEnc: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Appointment", AppointmentSchema);

const mongoose = require("mongoose");

const DoctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialty: { type: String, default: "" },
    clinic: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DoctorProfile", DoctorProfileSchema);

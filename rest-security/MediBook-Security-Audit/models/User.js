const mongoose = require("mongoose");

const Roles = {
  Patient: "Patient",
  Doctor: "Doctor",
  Nurse: "Nurse",
  Admin: "Admin",
  Insurance: "Insurance",
};

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: Object.values(Roles), required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true },

    // Patient PII (encrypted fields stored in separate model, but keep name here)
    name: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = { User: mongoose.model("User", UserSchema), Roles };

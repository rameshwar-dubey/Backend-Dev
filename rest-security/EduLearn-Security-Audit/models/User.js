const mongoose = require("mongoose");

const Roles = {
  Student: "Student",
  Instructor: "Instructor",
  Admin: "Admin",
};

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Roles), required: true },

    profile: {
      displayName: { type: String, default: "" },
      bio: { type: String, default: "" },
    },

    mfa: {
      enabled: { type: Boolean, default: false },
      secretBase32: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

module.exports = { User: mongoose.model("User", UserSchema), Roles };

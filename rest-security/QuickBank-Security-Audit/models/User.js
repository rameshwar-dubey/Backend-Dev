const mongoose = require("mongoose");

const WebAuthnCredentialSchema = new mongoose.Schema(
  {
    credentialID: { type: Buffer, required: true },
    credentialPublicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true },
    transports: { type: [String], default: [] },
  },
  { _id: false },
);

const DeviceSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, required: true },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastIp: { type: String },
    userAgent: { type: String },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, default: "" },
    passwordHash: { type: String, required: true },

    // Incremented on each successful login/password reset to invalidate other sessions.
    sessionVersion: { type: Number, default: 0 },

    // TOTP 2FA
    twoFactorEnabled: { type: Boolean, default: false },
    totpSecret: { type: String },

    // WebAuthn / biometric support
    webauthnCredentials: { type: [WebAuthnCredentialSchema], default: [] },
    webauthnChallenge: { type: String },

    // Brute force protection
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date },

    devices: { type: [DeviceSchema], default: [] },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);

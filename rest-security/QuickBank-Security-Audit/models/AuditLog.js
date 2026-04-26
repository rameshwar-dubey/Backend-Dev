const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    ip: { type: String },
    userAgent: { type: String },
    deviceFingerprint: { type: String },
    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);

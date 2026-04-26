const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: { type: String, default: "Anonymous" },
    action: { type: String, required: true },

    resourceType: { type: String, required: true },
    resourceId: { type: String, default: null },
    patientId: { type: String, default: null },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    statusCode: { type: Number, default: 0 },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);

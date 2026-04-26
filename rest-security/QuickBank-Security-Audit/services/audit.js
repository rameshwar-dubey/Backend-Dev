const AuditLog = require("../models/AuditLog");

async function writeAudit({ userId, action, req, meta = {} }) {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .toString()
    .split(",")[0]
    .trim();
  const userAgent = req.headers["user-agent"];
  const deviceFingerprint = req.deviceFingerprint;

  await AuditLog.create({
    userId,
    action,
    ip,
    userAgent,
    deviceFingerprint,
    meta,
  });
}

module.exports = { writeAudit };

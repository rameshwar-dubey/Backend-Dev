const AuditLog = require("../models/AuditLog");

function audit(action, { resourceType, getResourceId, getPatientId } = {}) {
  return async (req, res, next) => {
    // We log after response so we can include status.
    res.on("finish", async () => {
      try {
        await AuditLog.create({
          actorUserId: req.session?.userId || null,
          actorRole: req.currentUser?.role || "Anonymous",
          action,
          resourceType: resourceType || "Unknown",
          resourceId:
            typeof getResourceId === "function" ? getResourceId(req) : null,
          patientId:
            typeof getPatientId === "function" ? getPatientId(req) : null,
          ip: req.ip,
          userAgent: req.get("user-agent") || "",
          statusCode: res.statusCode,
        });
      } catch {
        // Never block requests on audit failures.
      }
    });
    next();
  };
}

module.exports = { audit };

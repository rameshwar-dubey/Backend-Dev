const { User } = require("../models/User");

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

async function attachCurrentUser(req, _res, next) {
  if (!req.session || !req.session.userId) {
    req.currentUser = null;
    return next();
  }

  const user = await User.findById(req.session.userId).select(
    "role email name",
  );
  req.currentUser = user || null;
  next();
}

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const role = req.currentUser?.role;
    if (!role) return res.status(401).json({ error: "Unauthorized" });
    if (!allowed.includes(role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, attachCurrentUser, requireRole };

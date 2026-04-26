const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(req.session.userId).select(
      "_id email sessionVersion twoFactorEnabled",
    );
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Prevent sessions being valid across multiple devices/browsers simultaneously.
    if (req.session.sessionVersion !== user.sessionVersion) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "SessionExpired" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };

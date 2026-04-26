const { authenticator } = require("otplib");
const User = require("../models/User");

const HIGH_VALUE_THRESHOLD_CENTS = 1000 * 100;

async function requireStepUp2FAIfHighValue(req, res, next) {
  try {
    const amountCents = Number(req.body?.amountCents);
    if (!Number.isInteger(amountCents))
      return res.status(400).json({ error: "ValidationError" });

    if (amountCents <= HIGH_VALUE_THRESHOLD_CENTS) {
      return next();
    }

    const user = await User.findById(req.session.userId).select(
      "_id twoFactorEnabled totpSecret",
    );
    if (!user || !user.twoFactorEnabled || !user.totpSecret) {
      return res.status(403).json({ error: "TwoFactorRequired" });
    }

    const otp = (req.headers["x-otp"] || "").toString().trim();
    if (!otp) return res.status(401).json({ error: "OTPRequired" });

    const ok = authenticator.check(otp, user.totpSecret);
    if (!ok) return res.status(401).json({ error: "InvalidOTP" });

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireStepUp2FAIfHighValue, HIGH_VALUE_THRESHOLD_CENTS };

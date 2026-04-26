const rateLimit = require("express-rate-limit");

function createLimiter({
  windowMs,
  max,
  standardHeaders = true,
  legacyHeaders = false,
  message = "TooManyRequests",
  keyGenerator,
}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders,
    legacyHeaders,
    message: { error: message },
    ...(keyGenerator ? { keyGenerator } : {}),
  });
}

function keyByIpAndUser(req) {
  const userId =
    req.session && req.session.userId ? String(req.session.userId) : "anon";
  return `${req.ip}:${userId}`;
}

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "TooManyLoginAttempts",
});
const resetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "TooManyPasswordResetRequests",
});

// Financial endpoints stricter
const transferLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "TooManyTransfers",
  keyGenerator: keyByIpAndUser,
});
const billPayLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 8,
  message: "TooManyBillPays",
  keyGenerator: keyByIpAndUser,
});

const readLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "TooManyRequests",
});

module.exports = {
  loginLimiter,
  resetLimiter,
  transferLimiter,
  billPayLimiter,
  readLimiter,
};

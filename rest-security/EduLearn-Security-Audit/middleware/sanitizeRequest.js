const mongoSanitize = require("mongo-sanitize");

function deepTrimStrings(value) {
  if (Array.isArray(value)) return value.map(deepTrimStrings);
  if (value && typeof value === "object") {
    const next = {};
    for (const [k, v] of Object.entries(value)) next[k] = deepTrimStrings(v);
    return next;
  }
  if (typeof value === "string") return value.trim();
  return value;
}

function sanitizeRequest(req, _res, next) {
  req.body = deepTrimStrings(mongoSanitize(req.body));
  req.query = deepTrimStrings(mongoSanitize(req.query));
  req.params = deepTrimStrings(mongoSanitize(req.params));
  next();
}

module.exports = { sanitizeRequest };

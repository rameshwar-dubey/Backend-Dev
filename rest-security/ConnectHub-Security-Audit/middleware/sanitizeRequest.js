const mongoSanitize = require("mongo-sanitize");

function deepTrimStrings(value) {
  if (Array.isArray(value)) {
    return value.map(deepTrimStrings);
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      next[k] = deepTrimStrings(v);
    }
    return next;
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
}

function sanitizeRequest(req, _res, next) {
  // Prevent Mongo operator injection in body/query/params
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);

  // Normalize whitespace
  req.body = deepTrimStrings(req.body);
  req.query = deepTrimStrings(req.query);
  req.params = deepTrimStrings(req.params);

  next();
}

module.exports = { sanitizeRequest };

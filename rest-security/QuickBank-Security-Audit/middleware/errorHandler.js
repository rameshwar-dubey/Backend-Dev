const { logger } = require("../utils/logger");

function notFound(req, res, next) {
  res.status(404).json({ error: "NotFound" });
}

function errorHandler(err, req, res, next) {
  let status = Number(err.statusCode || err.status || 500);

  // Normalize common DB/validation errors to 4xx without leaking internals.
  if (err && (err.name === "CastError" || err.name === "ValidationError")) {
    status = 400;
    err.publicError = "ValidationError";
  }

  // Duplicate key (e.g., unique email)
  if (err && err.code === 11000) {
    status = 409;
    err.publicError = "Conflict";
  }

  const safeStatus = status >= 400 && status < 600 ? status : 500;

  // Never leak stack traces / DB internals to clients
  logger.error(
    {
      err: {
        message: err.message,
        name: err.name,
        code: err.code,
      },
      path: req.path,
      method: req.method,
    },
    "request_failed",
  );

  const publicError =
    safeStatus >= 500 ? "InternalError" : err.publicError || "BadRequest";

  res.status(safeStatus).json({ error: publicError });
}

module.exports = { notFound, errorHandler };

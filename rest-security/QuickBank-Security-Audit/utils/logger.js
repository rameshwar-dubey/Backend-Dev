const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.body.password",
      "req.body.newPassword",
      "req.body.token",
      "*.passwordHash",
      "*.totpSecret",
    ],
    remove: true,
  },
});

module.exports = { logger };

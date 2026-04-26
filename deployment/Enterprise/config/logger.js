const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" })
  ]
});

module.exports = logger;
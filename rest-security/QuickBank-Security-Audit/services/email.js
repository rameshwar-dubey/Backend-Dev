const { logger } = require("../utils/logger");

// Mock email sender for the practice project.
async function sendEmail({ to, from, subject, text }) {
  logger.info({ to, from, subject, text }, "email_mock_send");
}

module.exports = { sendEmail };

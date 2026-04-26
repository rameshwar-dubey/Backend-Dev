const sanitizeHtml = require("sanitize-html");

function sanitizePlainText(input, { maxLen = 256 } = {}) {
  const clean = sanitizeHtml(String(input || ""), {
    allowedTags: [],
    allowedAttributes: {},
  });
  const trimmed = clean.trim();
  if (trimmed.length > maxLen) {
    return trimmed.slice(0, maxLen);
  }
  return trimmed;
}

function escapeForEmail(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

module.exports = { sanitizePlainText, escapeForEmail };

const escapeHtml = require("escape-html");
const sanitizeHtml = require("sanitize-html");
const validator = require("validator");

function toTrimmedString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sanitizePlainText(value, { maxLen = 5000 } = {}) {
  const trimmed = toTrimmedString(value);
  const truncated =
    trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
  return escapeHtml(truncated);
}

function sanitizeEmail(value) {
  const raw = toTrimmedString(value);
  const normalized = validator.normalizeEmail(raw);
  return normalized || "";
}

function sanitizeProfileText(value, { maxLen = 500 } = {}) {
  const raw = toTrimmedString(value);
  const stripped = sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {},
  });
  const truncated =
    stripped.length > maxLen ? stripped.slice(0, maxLen) : stripped;
  return escapeHtml(truncated);
}

function sanitizeCourseRichText(value, { maxLen = 20000 } = {}) {
  const raw = toTrimmedString(value);
  const truncated = raw.length > maxLen ? raw.slice(0, maxLen) : raw;

  // Allow typical rich formatting but remain strict.
  return sanitizeHtml(truncated, {
    allowedTags: [
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "blockquote",
      "code",
      "pre",
      "a",
      "h1",
      "h2",
      "h3",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const next = { ...attribs };
        if (typeof next.href === "string") next.href = next.href.trim();
        next.target = "_blank";
        next.rel = "noopener noreferrer";
        return { tagName, attribs: next };
      },
    },
  });
}

module.exports = {
  sanitizePlainText,
  sanitizeEmail,
  sanitizeProfileText,
  sanitizeCourseRichText,
};

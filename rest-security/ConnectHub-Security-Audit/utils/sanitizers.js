const escapeHtml = require("escape-html");
const sanitizeHtml = require("sanitize-html");
const validator = require("validator");
const { isSafeExternalUrl } = require("./security");

function toTrimmedString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sanitizePlainText(value, { maxLen = 5000 } = {}) {
  const trimmed = toTrimmedString(value);
  const truncated = trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
  return escapeHtml(truncated);
}

function sanitizeBio(value, { maxLen = 500 } = {}) {
  // Bio should be text-only; remove HTML and then escape.
  const raw = toTrimmedString(value);
  const stripped = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} });
  const truncated = stripped.length > maxLen ? stripped.slice(0, maxLen) : stripped;
  return escapeHtml(truncated);
}

function sanitizeLimitedPostHtml(value, { maxLen = 10000 } = {}) {
  const raw = toTrimmedString(value);
  const truncated = raw.length > maxLen ? raw.slice(0, maxLen) : raw;

  return sanitizeHtml(truncated, {
    allowedTags: ["b", "strong", "i", "em", "a"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"]
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const next = { ...attribs };

        if (typeof next.href === "string") {
          // sanitize-html already enforces scheme, but we also trim.
          next.href = next.href.trim();
        }

        // Force safe link behavior
        next.target = "_blank";
        next.rel = "noopener noreferrer";

        return { tagName, attribs: next };
      }
    }
  });
}

function sanitizeEmail(value) {
  const raw = toTrimmedString(value);
  const normalized = validator.normalizeEmail(raw);
  return normalized || "";
}

function sanitizeUsername(value) {
  // Keep it simple: trim + escape; validation schema should enforce allowed charset.
  return sanitizePlainText(value, { maxLen: 40 });
}

function sanitizeProfileUrl(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (!validator.isURL(raw, { require_protocol: true })) return "";
  if (!isSafeExternalUrl(raw)) return "";
  return raw;
}

module.exports = {
  sanitizePlainText,
  sanitizeBio,
  sanitizeLimitedPostHtml,
  sanitizeEmail,
  sanitizeUsername,
  sanitizeProfileUrl
};

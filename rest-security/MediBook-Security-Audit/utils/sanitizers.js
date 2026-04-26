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

function sanitizeMedicalText(value, { maxLen = 8000 } = {}) {
  // Allow medical terminology but not HTML: strip tags then escape.
  const raw = toTrimmedString(value);
  const stripped = sanitizeHtml(raw, {
    allowedTags: [],
    allowedAttributes: {},
  });
  const truncated =
    stripped.length > maxLen ? stripped.slice(0, maxLen) : stripped;
  return escapeHtml(truncated);
}

function sanitizeDoctorNotes(value, { maxLen = 8000 } = {}) {
  return sanitizeMedicalText(value, { maxLen });
}

function normalizeEmail(value) {
  const raw = toTrimmedString(value);
  const normalized = validator.normalizeEmail(raw);
  return normalized || "";
}

function normalizePhone(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  // Accept international format; you can constrain locale if needed.
  if (!validator.isMobilePhone(raw, "any")) return "";
  return raw;
}

function normalizeDateISO(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  // Strict ISO date: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";
  // Ensure round-trip correctness (avoids 2026-02-31 etc.)
  const iso = date.toISOString().slice(0, 10);
  if (iso !== raw) return "";
  return raw;
}

function normalizeSsn(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  const compact = raw.replace(/[^0-9]/g, "");
  if (compact.length !== 9) return "";
  return compact;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  sanitizePlainText,
  sanitizeMedicalText,
  sanitizeDoctorNotes,
  normalizeEmail,
  normalizePhone,
  normalizeDateISO,
  normalizeSsn,
  escapeRegex,
};

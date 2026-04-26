const fs = require("fs/promises");
const path = require("path");
const { fileTypeFromBuffer } = require("file-type");
const { nanoid } = require("nanoid");
const { encryptBuffer, decryptBuffer } = require("../utils/crypto");

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/dicom",
]);

function detectDicomMime(buffer) {
  // DICOM Part 10: 'DICM' at offset 128
  if (!Buffer.isBuffer(buffer) || buffer.length < 132) return false;
  return buffer.slice(128, 132).toString("ascii") === "DICM";
}

async function detectMime(buffer) {
  const detected = await fileTypeFromBuffer(buffer);
  if (detected?.mime) return detected.mime;
  if (detectDicomMime(buffer)) return "application/dicom";
  return "";
}

async function validateAndPersistEncryptedUpload({
  buffer,
  originalName,
  storageDir,
  maxBytes,
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("InvalidUpload");
  if (buffer.length > maxBytes) throw new Error("FileTooLarge");

  const mime = await detectMime(buffer);
  if (!ALLOWED_MIME.has(mime)) throw new Error("FileTypeNotAllowed");

  const safeOriginal = String(originalName || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);

  const id = nanoid(24);
  const storedName = `${id}.bin`;
  const fullPath = path.join(storageDir, storedName);

  const { iv, tag, ciphertext } = encryptBuffer(buffer);
  await fs.writeFile(fullPath, ciphertext, { flag: "wx" });

  return {
    storedName,
    originalName: safeOriginal,
    mime,
    size: buffer.length,
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
  };
}

async function readAndDecrypt({ storageDir, storedName, ivB64, tagB64 }) {
  const fullPath = path.join(storageDir, storedName);
  const ciphertext = await fs.readFile(fullPath);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  return decryptBuffer({ iv, tag, ciphertext });
}

// Placeholder malware scan
async function scanForMalwareOrThrow(_ciphertextPath) {
  return;
}

module.exports = {
  ALLOWED_MIME,
  validateAndPersistEncryptedUpload,
  readAndDecrypt,
  scanForMalwareOrThrow,
};

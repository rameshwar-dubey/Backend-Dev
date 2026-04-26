const fs = require("fs/promises");
const path = require("path");
const { fileTypeFromBuffer } = require("file-type");
const { nanoid } = require("nanoid");

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "video/mp4",
]);

async function validateAndPersistUpload({
  buffer,
  originalName,
  uploadDir,
  maxBytes,
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("InvalidUpload");
  if (buffer.length > maxBytes) throw new Error("FileTooLarge");

  const detected = await fileTypeFromBuffer(buffer);
  const mime = detected?.mime || "";
  if (!ALLOWED_MIME.has(mime)) throw new Error("FileTypeNotAllowed");

  // Basic filename safety; do not trust extensions.
  const safeOriginal = String(originalName || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  const id = nanoid(24);
  const ext = detected.ext ? `.${detected.ext}` : "";
  const storedName = `${id}${ext}`;
  const fullPath = path.join(uploadDir, storedName);

  await fs.writeFile(fullPath, buffer, { flag: "wx" });

  return {
    storedName,
    originalName: safeOriginal,
    mime,
    size: buffer.length,
  };
}

// Placeholder for malware scanning.
// In production, integrate a scanner (e.g., ClamAV daemon, S3 AV pipeline) and block on result.
async function scanForMalwareOrThrow(_filePath) {
  return;
}

module.exports = {
  validateAndPersistUpload,
  scanForMalwareOrThrow,
  ALLOWED_MIME,
};

const crypto = require("crypto");

function getKeyFromEnv() {
  const b64 = process.env.DATA_ENCRYPTION_KEY_BASE64 || "";
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "DATA_ENCRYPTION_KEY_BASE64 must be set to base64-encoded 32 bytes (AES-256-GCM)",
    );
  }
  return key;
}

function encryptString(plaintext) {
  if (plaintext === null || plaintext === undefined) return "";
  const text = String(plaintext);
  if (!text) return "";

  const key = getKeyFromEnv();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: v1:<iv_b64>:<tag_b64>:<ct_b64>
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

function decryptString(payload) {
  const value = String(payload || "");
  if (!value) return "";
  if (!value.startsWith("v1:")) return "";

  const parts = value.split(":");
  if (parts.length !== 4) return "";

  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");

  const key = getKeyFromEnv();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString("utf8");
}

function encryptBuffer(buffer) {
  const key = getKeyFromEnv();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, ciphertext };
}

function decryptBuffer({ iv, tag, ciphertext }) {
  const key = getKeyFromEnv();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

module.exports = { encryptString, decryptString, encryptBuffer, decryptBuffer };

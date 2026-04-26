const crypto = require("crypto");

function getKeyFromBase64(base64Key) {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error(
      "DATA_ENCRYPTION_KEY_BASE64 must be 32 bytes (base64-encoded)",
    );
  }
  return key;
}

function encryptString(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

function decryptString(ciphertextBase64, key) {
  const buf = Buffer.from(ciphertextBase64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function maskAccountNumber(accountNumber) {
  const s = String(accountNumber);
  const last4 = s.slice(-4);
  return last4.padStart(s.length, "*");
}

module.exports = {
  getKeyFromBase64,
  encryptString,
  decryptString,
  sha256Hex,
  randomToken,
  maskAccountNumber,
};

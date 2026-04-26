const speakeasy = require("speakeasy");

function createTotpSecret({ accountName, issuer }) {
  const secret = speakeasy.generateSecret({ name: `${issuer}:${accountName}` });
  return {
    base32: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

function verifyTotp({ secretBase32, token, window = 1 }) {
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token: String(token || ""),
    window,
  });
}

module.exports = { createTotpSecret, verifyTotp };

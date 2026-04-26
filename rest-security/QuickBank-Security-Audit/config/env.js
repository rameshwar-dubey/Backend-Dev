const dotenv = require("dotenv");

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getConfig() {
  return {
    port: Number(process.env.PORT || 4005),
    nodeEnv: process.env.NODE_ENV || "development",
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4005",

    mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quickbank",

    cookieName: process.env.COOKIE_NAME || "qb.sid",
    sessionSecret: required("SESSION_SECRET"),
    sessionStoreCryptoSecret: required("SESSION_STORE_CRYPTO_SECRET"),

    dataEncryptionKeyBase64: required("DATA_ENCRYPTION_KEY_BASE64"),

    emailFrom: process.env.EMAIL_FROM || "no-reply@quickbank.local",

    webauthn: {
      rpId: process.env.WEBAUTHN_RP_ID || "localhost",
      origin: process.env.WEBAUTHN_ORIGIN || "http://localhost:4005",
    },
  };
}

module.exports = { getConfig };

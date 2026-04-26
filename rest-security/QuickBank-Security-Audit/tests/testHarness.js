const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { buildApp } = require("../app");
const { connectDb } = require("../config/db");
const { getConfig } = require("../config/env");

let mongo;

function setTestEnv(overrides = {}) {
  process.env.NODE_ENV = "test";
  process.env.PORT = "0";
  process.env.APP_BASE_URL = "http://localhost";

  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET || "test_session_secret_32_chars_minimum!!";
  process.env.SESSION_STORE_CRYPTO_SECRET =
    process.env.SESSION_STORE_CRYPTO_SECRET ||
    "test_store_crypto_secret_32_chars!!";
  process.env.COOKIE_NAME = process.env.COOKIE_NAME || "qb.sid";

  // 32 bytes base64
  process.env.DATA_ENCRYPTION_KEY_BASE64 =
    process.env.DATA_ENCRYPTION_KEY_BASE64 ||
    Buffer.alloc(32, 7).toString("base64");

  process.env.WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
  process.env.WEBAUTHN_ORIGIN =
    process.env.WEBAUTHN_ORIGIN || "http://localhost";
  process.env.EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@quickbank.local";

  for (const [k, v] of Object.entries(overrides)) process.env[k] = v;
}

async function startTestApp() {
  setTestEnv();
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();

  const config = getConfig();
  await connectDb(config.mongoUri);

  const app = buildApp(config);
  return { app, config };
}

async function stopTestApp() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
}

module.exports = { startTestApp, stopTestApp };

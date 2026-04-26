const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { connectDb } = require("./config/db");
const { sanitizeRequest } = require("./middleware/sanitizeRequest");

function parseOriginList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function createApp(options = {}) {
  const app = express();

  app.disable("x-powered-by");

  app.use(express.json({ limit: "64kb" }));
  app.use(helmet());

  // CORS allow-list for web/mobile clients
  const allowedOrigins = [
    ...parseOriginList(process.env.WEB_ORIGINS),
    ...parseOriginList(process.env.MOBILE_ORIGINS),
  ];

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser requests (no Origin header)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("NotAllowedByCORS"));
      },
      credentials: true,
    }),
  );

  // Global request sanitization (Mongo operator injection + trims)
  app.use(sanitizeRequest);

  // Rate limiting (especially useful for auth endpoints)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Sessions
  const sessionEnabled = options.session?.enabled !== false;
  if (sessionEnabled) {
    const ttlSeconds = Number.parseInt(
      process.env.SESSION_TTL_SECONDS || "1800",
      10,
    );

    app.set("trust proxy", 1);

    app.use(
      session({
        name: "connecthub.sid",
        secret: process.env.SESSION_SECRET || "change-me",
        resave: false,
        saveUninitialized: false,
        rolling: true,
        unset: "destroy",
        store: MongoStore.create({
          mongoUrl: process.env.MONGO_URI,
          ttl: Number.isFinite(ttlSeconds) ? ttlSeconds : 1800,
        }),
        cookie: {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: (Number.isFinite(ttlSeconds) ? ttlSeconds : 1800) * 1000,
        },
      }),
    );
  }

  // Routes
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/auth", require("./routes/authRoutes"));
  app.use("/posts", require("./routes/postRoutes"));
  app.use("/profile", require("./routes/profileRoutes"));
  app.use("/messages", require("./routes/messageRoutes"));
  app.use("/social", require("./routes/followRoutes"));

  // Error handler (including CORS errors)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err && err.message === "NotAllowedByCORS") {
      return res.status(403).json({ error: "CORS" });
    }
    return res.status(500).json({ error: "ServerError" });
  });

  return app;
}

async function main() {
  const port = Number.parseInt(process.env.PORT || "3001", 10);

  await connectDb(process.env.MONGO_URI);

  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`ConnectHub API listening on ${port}`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createApp };

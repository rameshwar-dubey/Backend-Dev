const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cors = require("cors");
const helmet = require("helmet");
const pino = require("pino");
const pinoHttp = require("pino-http");
require("dotenv").config();

const { connectDb } = require("./config/db");
const { buildAllowedOriginsFromEnv } = require("./config/cors");
const { buildHelmetConfigFromEnv } = require("./config/helmet");
const { sanitizeRequest } = require("./middleware/sanitizeRequest");
const { generalLimiter } = require("./middleware/rateLimiters");
const { attachCurrentUser } = require("./middleware/auth");

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  const logger = pino({ level: process.env.LOG_LEVEL || "info" });
  app.use(pinoHttp({ logger }));

  app.use(express.json({ limit: "128kb" }));

  app.use(helmet(buildHelmetConfigFromEnv(process.env)));

  const allowedOrigins = buildAllowedOriginsFromEnv(process.env);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("NotAllowedByCORS"));
      },
      credentials: true,
    }),
  );

  app.use(sanitizeRequest);
  app.use(generalLimiter);

  // Sessions (MongoStore)
  const ttlSeconds = Number.parseInt(
    process.env.SESSION_TTL_SECONDS || "1800",
    10,
  );
  app.set("trust proxy", 1);
  app.use(
    session({
      name: "edulearn.sid",
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

  app.use(attachCurrentUser);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", require("./routes/authRoutes"));
  app.use("/courses", require("./routes/courseRoutes"));
  app.use("/quizzes", require("./routes/quizRoutes"));
  app.use("/messages", require("./routes/messageRoutes"));
  app.use("/uploads", require("./routes/uploadRoutes"));
  app.use("/admin", require("./routes/adminRoutes"));

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err && err.message === "NotAllowedByCORS") {
      return res.status(403).json({ error: "CORS" });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: "ServerError" });
  });

  return app;
}

async function main() {
  const port = Number.parseInt(process.env.PORT || "3002", 10);
  await connectDb(process.env.MONGO_URI);
  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`EduLearn API listening on ${port}`);
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

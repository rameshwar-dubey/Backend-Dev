const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const csrf = require("csurf");
const pinoHttp = require("pino-http");

const { logger } = require("./utils/logger");
const { deviceFingerprint } = require("./middleware/deviceFingerprint");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const beneficiaryRoutes = require("./routes/beneficiaryRoutes");
const loanRoutes = require("./routes/loanRoutes");

function buildApp(config) {
  const app = express();
  app.enable("trust proxy");

  app.use(pinoHttp({ logger }));
  app.use(compression());

  app.use(
    helmet({
      xPoweredBy: false,
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'none'"],
          "base-uri": ["'none'"],
          "frame-ancestors": ["'none'"],
          "form-action": ["'self'"],
          "script-src": ["'self'"],
          "style-src": ["'self'"],
          "img-src": ["'self'"],
          "connect-src": ["'self'"],
          "object-src": ["'none'"],
          "upgrade-insecure-requests": [],
        },
      },
      hsts:
        config.nodeEnv === "production"
          ? { maxAge: 15552000, includeSubDomains: true, preload: true }
          : false,
    }),
  );

  if (config.nodeEnv === "production") {
    app.use((req, res, next) => {
      if (req.secure) return next();
      return res.status(400).json({ error: "HTTPSRequired" });
    });
  }

  app.use(
    cors({
      origin: config.appBaseUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );

  app.use(express.json({ limit: "20kb" }));
  app.use(mongoSanitize({ replaceWith: "_" }));
  app.use(deviceFingerprint);

  app.use(
    session({
      name: config.cookieName,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 30,
      },
      store: MongoStore.create({
        mongoUrl: config.mongoUri,
        crypto: {
          secret: config.sessionStoreCryptoSecret,
        },
        ttl: 60 * 30,
      }),
    }),
  );

  const csrfProtection = csrf({ cookie: false });

  app.get("/health", (req, res) => res.json({ ok: true }));
  app.get("/csrf", csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  app.use("/auth", authRoutes);

  app.use("/accounts", csrfProtection, accountRoutes);
  app.use("/transactions", csrfProtection, transactionRoutes);
  app.use("/beneficiaries", csrfProtection, beneficiaryRoutes);
  app.use("/loans", csrfProtection, loanRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };

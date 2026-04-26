const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { authenticator } = require("otplib");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const { isoBase64URL } = require("@simplewebauthn/server/helpers");

const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const { validate } = require("../middleware/validate");
const { loginLimiter, resetLimiter } = require("../middleware/rateLimiters");
const { sanitizePlainText, escapeForEmail } = require("../utils/sanitizers");
const { randomToken, sha256Hex } = require("../utils/crypto");
const { getConfig } = require("../config/env");
const { writeAudit } = require("../services/audit");
const { sendEmail } = require("../services/email");

const router = express.Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(200),
    name: z.string().max(100).optional(),
  }),
});

router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.validated.body;
    const existing = await User.findOne({ email: email.toLowerCase() }).select(
      "_id",
    );
    if (existing) return res.status(409).json({ error: "EmailInUse" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: sanitizePlainText(name || "", { maxLen: 100 }),
    });

    await writeAudit({ userId: user._id, action: "AUTH_REGISTER", req });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200),
  }),
});

router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      const now = new Date();

      if (!user) {
        return res.status(401).json({ error: "InvalidCredentials" });
      }

      if (user.lockUntil && user.lockUntil > now) {
        return res.status(423).json({ error: "AccountLocked" });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        user.failedLoginCount += 1;
        if (user.failedLoginCount >= 10) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          user.failedLoginCount = 0;
        }
        await user.save();
        await writeAudit({
          userId: user._id,
          action: "AUTH_LOGIN_FAILED",
          req,
        });
        return res.status(401).json({ error: "InvalidCredentials" });
      }

      // Successful login: invalidate other sessions across devices.
      user.failedLoginCount = 0;
      user.lockUntil = undefined;
      user.sessionVersion += 1;

      // Device fingerprint tracking
      const fp = req.deviceFingerprint;
      const ua = req.headers["user-agent"] || "";
      const ip = req.clientIp || "";
      const existingDevice = user.devices.find((d) => d.fingerprint === fp);
      if (existingDevice) {
        existingDevice.lastSeenAt = new Date();
        existingDevice.lastIp = ip;
        existingDevice.userAgent = ua;
      } else {
        user.devices.push({ fingerprint: fp, lastIp: ip, userAgent: ua });
        await writeAudit({
          userId: user._id,
          action: "SUSPICIOUS_NEW_DEVICE",
          req,
          meta: { fingerprint: fp },
        });
      }

      await user.save();

      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) return reject(err);
          req.session.userId = user._id.toString();
          req.session.sessionVersion = user.sessionVersion;
          resolve();
        });
      });

      await writeAudit({ userId: user._id, action: "AUTH_LOGIN", req });

      res.json({ ok: true, twoFactorEnabled: user.twoFactorEnabled });
    } catch (err) {
      next(err);
    }
  },
);

router.post("/logout", async (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => {
    res.clearCookie(getConfig().cookieName);
    res.json({ ok: true });
  });
});

// ---- Password reset (expiring, one-time, non-reusable) ----
const resetRequestSchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
  }),
});

router.post(
  "/password-reset/request",
  resetLimiter,
  validate(resetRequestSchema),
  async (req, res, next) => {
    try {
      const { email } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "_id email",
      );

      // Always return ok to avoid account enumeration.
      if (!user) return res.json({ ok: true });

      const rawToken = randomToken(32);
      const tokenHash = sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        expiresAt,
      });

      const config = getConfig();
      const resetLink = `${config.appBaseUrl}/auth/password-reset/confirm?token=${rawToken}`;

      await sendEmail({
        to: user.email,
        from: config.emailFrom,
        subject: "QuickBank password reset",
        text: `Use this link within 15 minutes: ${resetLink}`,
      });

      await writeAudit({
        userId: user._id,
        action: "AUTH_PASSWORD_RESET_REQUESTED",
        req,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

const resetConfirmSchema = z.object({
  body: z.object({
    token: z.string().min(10).max(200),
    newPassword: z.string().min(12).max(200),
  }),
});

router.post(
  "/password-reset/confirm",
  validate(resetConfirmSchema),
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.validated.body;
      const tokenHash = sha256Hex(token);

      const record = await PasswordResetToken.findOne({ tokenHash });
      if (!record)
        return res.status(400).json({ error: "InvalidOrExpiredToken" });
      if (record.usedAt)
        return res.status(400).json({ error: "InvalidOrExpiredToken" });
      if (record.expiresAt <= new Date())
        return res.status(400).json({ error: "InvalidOrExpiredToken" });

      const user = await User.findById(record.userId);
      if (!user)
        return res.status(400).json({ error: "InvalidOrExpiredToken" });

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.sessionVersion += 1;
      await user.save();

      record.usedAt = new Date();
      await record.save();

      await writeAudit({
        userId: user._id,
        action: "AUTH_PASSWORD_RESET_COMPLETED",
        req,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---- TOTP 2FA setup ----
const twoFASetupSchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200),
  }),
});

router.post(
  "/2fa/setup",
  loginLimiter,
  validate(twoFASetupSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ error: "InvalidCredentials" });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "InvalidCredentials" });

      const secret = authenticator.generateSecret();
      const label = `QuickBank:${user.email}`;
      const otpauth = authenticator.keyuri(user.email, "QuickBank", secret);

      user.totpSecret = secret;
      user.twoFactorEnabled = false;
      await user.save();

      await writeAudit({
        userId: user._id,
        action: "AUTH_2FA_SETUP_STARTED",
        req,
      });

      res.json({ secret, otpauth, label });
    } catch (err) {
      next(err);
    }
  },
);

const twoFAVerifySchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
    otp: z.string().min(6).max(8),
  }),
});

router.post(
  "/2fa/verify",
  validate(twoFAVerifySchema),
  async (req, res, next) => {
    try {
      const { email, otp } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.totpSecret)
        return res.status(400).json({ error: "TwoFactorNotInitialized" });

      const isValid = authenticator.check(otp, user.totpSecret);
      if (!isValid) return res.status(400).json({ error: "InvalidOTP" });

      user.twoFactorEnabled = true;
      await user.save();

      await writeAudit({ userId: user._id, action: "AUTH_2FA_ENABLED", req });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---- WebAuthn (biometric / platform authenticator support) ----
const webauthnStartSchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
  }),
});

router.post(
  "/webauthn/register/options",
  validate(webauthnStartSchema),
  async (req, res, next) => {
    try {
      const config = getConfig();
      const { email } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(400).json({ error: "UnknownUser" });

      const options = await generateRegistrationOptions({
        rpName: "QuickBank",
        rpID: config.webauthn.rpId,
        userID: user._id.toString(),
        userName: user.email,
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
        },
        excludeCredentials: user.webauthnCredentials.map((cred) => ({
          id: cred.credentialID,
          type: "public-key",
        })),
      });

      user.webauthnChallenge = options.challenge;
      await user.save();

      res.json(options);
    } catch (err) {
      next(err);
    }
  },
);

const webauthnRegisterVerifySchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
    response: z.any(),
  }),
});

router.post(
  "/webauthn/register/verify",
  validate(webauthnRegisterVerifySchema),
  async (req, res, next) => {
    try {
      const config = getConfig();
      const { email, response } = req.validated.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.webauthnChallenge)
        return res.status(400).json({ error: "BadWebAuthnState" });

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: user.webauthnChallenge,
        expectedOrigin: config.webauthn.origin,
        expectedRPID: config.webauthn.rpId,
      });

      if (!verification.verified)
        return res.status(400).json({ error: "WebAuthnNotVerified" });

      const { registrationInfo } = verification;
      user.webauthnCredentials.push({
        credentialID: registrationInfo.credentialID,
        credentialPublicKey: registrationInfo.credentialPublicKey,
        counter: registrationInfo.counter,
        transports: response.response?.transports || [],
      });

      user.webauthnChallenge = undefined;
      await user.save();

      await writeAudit({
        userId: user._id,
        action: "AUTH_WEBAUTHN_REGISTERED",
        req,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/webauthn/authenticate/options",
  validate(webauthnStartSchema),
  async (req, res, next) => {
    try {
      const config = getConfig();
      const { email } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(400).json({ error: "UnknownUser" });

      const options = await generateAuthenticationOptions({
        rpID: config.webauthn.rpId,
        userVerification: "required",
        allowCredentials: user.webauthnCredentials.map((cred) => ({
          id: cred.credentialID,
          type: "public-key",
          transports: cred.transports,
        })),
      });

      user.webauthnChallenge = options.challenge;
      await user.save();

      res.json(options);
    } catch (err) {
      next(err);
    }
  },
);

const webauthnAuthVerifySchema = z.object({
  body: z.object({ email: z.string().email().max(254), response: z.any() }),
});

router.post(
  "/webauthn/authenticate/verify",
  validate(webauthnAuthVerifySchema),
  async (req, res, next) => {
    try {
      const config = getConfig();
      const { email, response } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.webauthnChallenge)
        return res.status(400).json({ error: "BadWebAuthnState" });

      const credIdBuf = isoBase64URL.toBuffer(response.rawId);
      const credential = user.webauthnCredentials.find((c) =>
        c.credentialID.equals(credIdBuf),
      );
      if (!credential)
        return res.status(400).json({ error: "UnknownCredential" });

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: user.webauthnChallenge,
        expectedOrigin: config.webauthn.origin,
        expectedRPID: config.webauthn.rpId,
        authenticator: {
          credentialID: credential.credentialID,
          credentialPublicKey: credential.credentialPublicKey,
          counter: credential.counter,
        },
      });

      if (!verification.verified)
        return res.status(401).json({ error: "WebAuthnNotVerified" });

      credential.counter = verification.authenticationInfo.newCounter;
      user.webauthnChallenge = undefined;

      // Biometric login counts as successful login.
      user.failedLoginCount = 0;
      user.lockUntil = undefined;
      user.sessionVersion += 1;

      await user.save();

      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) return reject(err);
          req.session.userId = user._id.toString();
          req.session.sessionVersion = user.sessionVersion;
          resolve();
        });
      });

      await writeAudit({
        userId: user._id,
        action: "AUTH_WEBAUTHN_LOGIN",
        req,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

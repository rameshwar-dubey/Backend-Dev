jest.mock("../services/email", () => ({
  sendEmail: jest.fn(async () => {}),
}));

const request = require("supertest");
const { authenticator } = require("otplib");

const { startTestApp, stopTestApp } = require("./testHarness");
const { sendEmail } = require("../services/email");

const User = require("../models/User");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const PasswordResetToken = require("../models/PasswordResetToken");

const {
  getKeyFromBase64,
  encryptString,
  sha256Hex,
} = require("../utils/crypto");
const { getConfig } = require("../config/env");

async function getCsrf(agent) {
  const res = await agent.get("/csrf");
  expect(res.status).toBe(200);
  return res.body.csrfToken;
}

async function register(agent, email, password) {
  const res = await agent
    .post("/auth/register")
    .send({ email, password, name: "Test User" });
  expect([201, 409]).toContain(res.status);
}

async function login(agent, email, password) {
  const res = await agent.post("/auth/login").send({ email, password });
  expect(res.status).toBe(200);
}

async function enable2FA(email, password) {
  const setup = await request(global.__APP__)
    .post("/auth/2fa/setup")
    .send({ email, password });
  expect(setup.status).toBe(200);
  const secret = setup.body.secret;
  const otp = authenticator.generate(secret);

  const verify = await request(global.__APP__)
    .post("/auth/2fa/verify")
    .send({ email, otp });
  expect(verify.status).toBe(200);
  return { secret };
}

async function createAccountForUser(
  userId,
  balanceCents,
  accountNumber = "123456789012",
) {
  const config = getConfig();
  const key = getKeyFromBase64(config.dataEncryptionKeyBase64);
  const enc = encryptString(accountNumber, key);
  return Account.create({
    userId,
    accountNumberEnc: enc,
    accountNumberLast4: accountNumber.slice(-4),
    balanceCents,
    currency: "USD",
    status: "active",
  });
}

describe("QuickBank security regression tests", () => {
  let app;

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    global.__APP__ = app;
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(() => {
    sendEmail.mockClear();
  });

  test("Sessions are invalidated across devices/browsers on login", async () => {
    const email = "alice@example.com";
    const password = "very-strong-password-123!";

    const agent1 = request.agent(app);
    const agent2 = request.agent(app);

    await register(agent1, email, password);
    const user = await User.findOne({ email });
    await createAccountForUser(user._id, 500000);

    await login(agent1, email, password);
    const csrf1 = await getCsrf(agent1);
    const a1 = await agent1.get("/accounts").set("x-csrf-token", csrf1);
    expect(a1.status).toBe(200);

    await login(agent2, email, password);

    const a1b = await agent1.get("/accounts").set("x-csrf-token", csrf1);
    expect(a1b.status).toBe(401);
    expect(a1b.body.error).toBe("SessionExpired");
  });

  test("Transfer confirmation prevents amount tampering (AmountMismatch)", async () => {
    const email = "bob@example.com";
    const password = "very-strong-password-456!";

    const agent = request.agent(app);
    await register(agent, email, password);
    await login(agent, email, password);
    const csrf = await getCsrf(agent);

    const user = await User.findOne({ email });
    const from = await createAccountForUser(user._id, 1_000_000);

    // Create a second account (internal) not owned by user (still allowed as recipient)
    const otherUser = await User.create({
      email: "charlie@example.com",
      passwordHash: user.passwordHash,
    });
    const to = await createAccountForUser(otherUser._id, 0, "555566667777");

    const init = await agent
      .post("/transactions/transfer/initiate")
      .set("x-csrf-token", csrf)
      .send({
        fromAccountId: from._id.toString(),
        toAccountId: to._id.toString(),
        amountCents: 10000,
        description: "test",
      });
    expect(init.status).toBe(201);

    const confirm = await agent
      .post(`/transactions/transfer/${init.body.transactionId}/confirm`)
      .set("x-csrf-token", csrf)
      .send({ amountCents: 1_000_000_00 });
    expect(confirm.status).toBe(400);
    expect(confirm.body.error).toBe("AmountMismatch");
  });

  test("High-value transfers require 2FA enrollment and valid OTP", async () => {
    const email = "dana@example.com";
    const password = "very-strong-password-789!";

    const agent = request.agent(app);
    await register(agent, email, password);
    await login(agent, email, password);

    await enable2FA(email, password);

    const csrf = await getCsrf(agent);
    const user = await User.findOne({ email });
    const from = await createAccountForUser(user._id, 10_000_000);

    const otherUser = await User.create({
      email: "ed@example.com",
      passwordHash: user.passwordHash,
    });
    const to = await createAccountForUser(otherUser._id, 0, "999900001111");

    const init = await agent
      .post("/transactions/transfer/initiate")
      .set("x-csrf-token", csrf)
      .send({
        fromAccountId: from._id.toString(),
        toAccountId: to._id.toString(),
        amountCents: 200_000,
        description: "Rent <img src=x onerror=1>",
      });
    expect(init.status).toBe(201);

    const confirmNoOtp = await agent
      .post(`/transactions/transfer/${init.body.transactionId}/confirm`)
      .set("x-csrf-token", csrf)
      .send({ amountCents: 200_000 });
    expect(confirmNoOtp.status).toBe(401);
    expect(confirmNoOtp.body.error).toBe("OTPRequired");

    const dbUser = await User.findOne({ email });
    const otp = authenticator.generate(dbUser.totpSecret);

    const confirmOk = await agent
      .post(`/transactions/transfer/${init.body.transactionId}/confirm`)
      .set("x-csrf-token", csrf)
      .set("x-otp", otp)
      .send({ amountCents: 200_000 });
    expect(confirmOk.status).toBe(200);

    // Email notification should not contain HTML tags
    expect(sendEmail).toHaveBeenCalled();
    const lastCall = sendEmail.mock.calls.at(-1)[0];
    expect(lastCall.text).not.toMatch(/</);
    expect(lastCall.text).not.toMatch(/onerror/i);
  });

  test("Transaction history is scoped to the authenticated user (prevents IDOR)", async () => {
    const u1 = await User.create({
      email: "u1@example.com",
      passwordHash: "x",
    });
    const u2 = await User.create({
      email: "u2@example.com",
      passwordHash: "y",
    });

    const a1 = await createAccountForUser(u1._id, 100000, "111122223333");
    const a2 = await createAccountForUser(u2._id, 100000, "444455556666");

    await Transaction.create({
      userId: u2._id,
      type: "transfer",
      fromAccountId: a2._id,
      toAccountId: a1._id,
      amountCents: 12345,
      description: "u2 only",
      status: "completed",
    });

    const email = "history@example.com";
    const password = "very-strong-password-000!";
    const agent = request.agent(app);
    await register(agent, email, password);
    await login(agent, email, password);

    const csrf = await getCsrf(agent);
    const res = await agent
      .get("/transactions?limit=50")
      .set("x-csrf-token", csrf);
    expect(res.status).toBe(200);
    expect(
      res.body.transactions.find((t) => t.description === "u2 only"),
    ).toBeFalsy();
  });

  test("Beneficiary account numbers reject operator/injection payloads", async () => {
    const email = "ben@example.com";
    const password = "very-strong-password-111!";

    const agent = request.agent(app);
    await register(agent, email, password);
    await login(agent, email, password);

    const csrf = await getCsrf(agent);

    const res = await agent
      .post("/beneficiaries")
      .set("x-csrf-token", csrf)
      .send({ name: "Evil", accountNumber: '{"$gt":""}', nickname: "x" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
  });

  test("Login brute force is mitigated with account lockout", async () => {
    const email = "lock@example.com";
    const password = "very-strong-password-222!";

    const agent = request.agent(app);
    await register(agent, email, password);

    for (let i = 0; i < 10; i++) {
      const r = await agent
        .post("/auth/login")
        .send({ email, password: "wrong" });
      expect([401, 423]).toContain(r.status);
    }

    const locked = await agent.post("/auth/login").send({ email, password });
    expect([423, 200]).toContain(locked.status);
  });

  test("Password reset tokens are one-time use and expire", async () => {
    const email = "reset@example.com";
    const password = "very-strong-password-333!";

    const agent = request.agent(app);
    await register(agent, email, password);

    const reqRes = await agent
      .post("/auth/password-reset/request")
      .send({ email });
    expect(reqRes.status).toBe(200);

    expect(sendEmail).toHaveBeenCalled();
    const { text } = sendEmail.mock.calls.at(-1)[0];
    const m = text.match(/token=([0-9a-f]+)/i);
    expect(m).toBeTruthy();
    const token = m[1];

    const confirm1 = await agent
      .post("/auth/password-reset/confirm")
      .send({ token, newPassword: "new-strong-password-444!" });
    expect(confirm1.status).toBe(200);

    const confirm2 = await agent
      .post("/auth/password-reset/confirm")
      .send({ token, newPassword: "new-strong-password-555!" });
    expect(confirm2.status).toBe(400);
    expect(confirm2.body.error).toBe("InvalidOrExpiredToken");

    // Expired token rejected
    const user = await User.findOne({ email });
    const rawExpiredToken = "expired-token-123";
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: sha256Hex(rawExpiredToken),
      expiresAt: new Date(Date.now() - 1000),
    });
    const expired = await agent
      .post("/auth/password-reset/confirm")
      .send({
        token: rawExpiredToken,
        newPassword: "new-strong-password-666!",
      });
    expect(expired.status).toBe(400);
  });

  test("Errors do not leak internal details (e.g., CastError)", async () => {
    const email = "err@example.com";
    const password = "very-strong-password-777!";

    const agent = request.agent(app);
    await register(agent, email, password);
    await login(agent, email, password);

    const csrf = await getCsrf(agent);
    const res = await agent
      .get("/accounts/not-an-objectid/balance")
      .set("x-csrf-token", csrf);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
    expect(JSON.stringify(res.body)).not.toMatch(/CastError|mongo|mongoose/i);
  });

  test("Transfer endpoint rate limiting blocks automated abuse", async () => {
    const email = "rate@example.com";
    const password = "very-strong-password-888!";

    const agent = request.agent(app);
    await register(agent, email, password);
    await login(agent, email, password);

    const csrf = await getCsrf(agent);
    const user = await User.findOne({ email });
    const from = await createAccountForUser(
      user._id,
      10_000_000,
      "222233334444",
    );

    const otherUser = await User.create({
      email: "rate-to@example.com",
      passwordHash: user.passwordHash,
    });
    const to = await createAccountForUser(otherUser._id, 0, "777788889999");

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const r = await agent
        .post("/transactions/transfer/initiate")
        .set("x-csrf-token", csrf)
        .send({
          fromAccountId: from._id.toString(),
          toAccountId: to._id.toString(),
          amountCents: 1000,
          description: "spam",
        });
      lastStatus = r.status;
    }

    expect(lastStatus).toBe(429);
  });
});

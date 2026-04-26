# QuickBank — Security Report (Practice Problem 5)

## 1) Vulnerabilities identified (from scenario)

- **Amount tampering**: client manipulates transfer amount in request (e.g., $1,000,000)
- **Transaction history IDOR**: search/filters allow viewing other users’ transactions
- **MongoDB injection in account fields**: account numbers accept operators/objects (e.g., `$gt`, `$ne`)
- **Concurrent sessions across devices**: session remains valid in multiple browsers/devices
- **Unlimited login attempts**: brute force feasible
- **XSS via email notifications**: transaction descriptions unsanitized
- **Verbose errors**: stack/DB structure leaked via error responses
- **Password reset tokens never expire / reusable**

## 2) Threat model (how it’s exploited + impact)

- **Amount tampering** → attacker steals funds or causes overdrafts/fraud; impacts integrity and financial loss.
- **IDOR on history** → attacker enumerates transactions; impacts confidentiality, compliance, customer trust.
- **Mongo injection** → bypass lookups or cause unexpected queries; impacts authz and data exposure.
- **Session concurrency** → stolen cookies remain useful; impacts account takeover window.
- **Brute force** → credential stuffing and password guessing; impacts authentication.
- **Email XSS** → if email client renders HTML, attacker can execute script-like payloads; impacts phishing/credential theft.
- **Verbose errors** → improves attacker recon; faster exploit development.
- **Non-expiring reset tokens** → persistent account takeover if token leaked.

## 3) Implementation (what code fixes what)

- **Session management + invalidation**
  - `middleware/requireAuth.js`: enforces `sessionVersion` equality
  - `routes/authRoutes.js`: increments `User.sessionVersion` on successful login and password reset
- **Brute-force defenses**
  - `middleware/rateLimiters.js`: endpoint-specific rate limits
  - `routes/authRoutes.js`: lockout after repeated failed logins
- **2FA step-up for > $1,000**
  - `middleware/requireStepUp2FA.js`: requires 2FA enrollment and a valid `X-OTP` for high-value confirms
  - `routes/authRoutes.js`: TOTP setup and verification
- **Biometric support (mobile)**
  - `routes/authRoutes.js`: WebAuthn registration/authentication endpoints (platform authenticators)
- **Transaction security & confirmation workflow**
  - `routes/transactionRoutes.js`: `initiate` creates PENDING tx; `confirm` is atomic and prevents amount mismatch
- **MongoDB injection protections**
  - `express-mongo-sanitize` in `app.js`
  - strict schemas (Zod) + explicit string patterns (beneficiary account numbers)
- **XSS protection for notifications**
  - `utils/sanitizers.js` + sanitized email text usage in `routes/transactionRoutes.js`
- **Safe errors**
  - `middleware/errorHandler.js`: returns generic errors; no stack or DB details
- **Sensitive data handling**
  - `utils/crypto.js`: AES-256-GCM helpers
  - encrypted account numbers stored in `models/Account.js` and `models/Beneficiary.js`

## 4) Testing (regression coverage)

- `tests/security.test.js` covers:
  - session invalidation across devices
  - amount tampering → `AmountMismatch`
  - step-up 2FA requirement for high-value confirms
  - IDOR protection for transaction history
  - injection payload rejection for account numbers
  - lockout behavior on repeated failed logins
  - reset token expiry and one-time use
  - safe error responses (no `CastError`/Mongo leakage)
  - financial endpoint rate limiting

## 5) Guidelines for future development

- Validate all input with schemas and reject unknown fields.
- Scope all DB reads/writes by `req.session.userId` (no “by id only” queries for user data).
- Never trust client-provided amounts, limits, or authorization decisions.
- Treat any user-controlled string as unsafe for HTML/email; sanitize/escape at output.
- Prefer step-up auth for high-risk actions.

## 6) Code review checklist

See `docs/SECURITY_REVIEW_CHECKLIST.md`.

## 7) Deployment guide

See `docs/DEPLOYMENT.md`.

## 8) Additional compliance and response documentation

- PCI readiness notes: `docs/PCI_DSS.md`
- Incident response plan: `docs/INCIDENT_RESPONSE.md`

# QuickBank — Production Deployment Guide (security)

## Environment

- Set `NODE_ENV=production`
- Configure:
  - `MONGODB_URI`
  - `SESSION_SECRET` (>= 32 chars)
  - `SESSION_STORE_CRYPTO_SECRET` (>= 32 chars)
  - `DATA_ENCRYPTION_KEY_BASE64` (32 bytes base64)
  - `APP_BASE_URL` (https URL)
  - `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN`

## HTTPS enforcement

- Run behind TLS (reverse proxy / load balancer). In production, the app rejects non-HTTPS requests.

## Cookies & sessions

- Cookies are `HttpOnly` and `Secure` in production.
- Sessions are stored in MongoDB using `connect-mongo` with at-rest encryption.
- Short session TTL is recommended; tune in `app.js`.

## Headers

- Helmet is enabled with strict CSP and HSTS in production.

## Logging/monitoring

- Use centralized logs (stdout aggregation) and retain audit logs.
- Alert on:
  - spikes in `AUTH_LOGIN_FAILED`
  - new-device events
  - high-value transaction confirmations
  - rate limit blocks

## Secrets management

- Store secrets in a secret manager (not `.env` in production).
- Rotate `SESSION_SECRET`, session-store crypto secret, and encryption keys with a planned procedure.

## Database hardening

- Restrict MongoDB network access to app subnets only.
- Enable authentication, backups, and point-in-time recovery.

## Operational checks

- Run `npm test` in CI.
- Add SAST/DAST in pipeline for continuous validation.

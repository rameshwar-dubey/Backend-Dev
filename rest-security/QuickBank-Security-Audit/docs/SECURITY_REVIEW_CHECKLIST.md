# QuickBank — Security Review Checklist

## Authentication & sessions

- Passwords hashed with bcrypt/argon2 and never logged
- Rate limit login and password reset
- Lockout/backoff on repeated failures
- Session cookies: `HttpOnly`, `Secure` (prod), `SameSite`
- Session fixation protection (`req.session.regenerate`)
- Global session invalidation strategy (e.g., `sessionVersion`)

## Authorization

- Every user data access is scoped by `req.session.userId`
- No IDOR via `:id` parameters
- Admin-only actions require role checks

## Input validation & injection

- Zod (or equivalent) schemas on every route
- Reject unknown fields; enforce type/length/pattern
- `express-mongo-sanitize` or safe query construction used everywhere

## XSS & output encoding

- No untrusted HTML in emails/notifications
- Sanitize/escape user-controlled text at output boundaries

## Financial operations

- Server-side amount limits and balance checks
- Two-step confirmation for transfers and bill pay
- Step-up auth (2FA) for high-value actions
- Rate limiting specific to financial endpoints

## Error handling

- No stack traces / DB messages in client responses
- Safe error taxonomy (`ValidationError`, `Unauthorized`, etc.)

## Logging & monitoring

- Audit logs for authentication and financial actions
- Alerts for anomalous behavior (velocity/high amount/new device)

## Secure deployment

- HTTPS enforced
- HSTS enabled in production
- Secrets stored in a secret manager
- MongoDB network access restricted

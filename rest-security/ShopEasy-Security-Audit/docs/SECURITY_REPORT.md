# ShopEasy — Security Report (practice)

## 1) Vulnerabilities to guard against

- **Hard-coded secrets**: session secret in code
- **Insecure cookies**: missing `Secure` in production
- **Missing validation**: accepts arbitrary request payloads
- **IDOR**: access to other users’ orders/reviews by ID (if added)
- **Injection/XSS**: user text used in reviews or product content

## 2) Threat model

- Hard-coded secrets → session forgery if leaked
- Insecure cookies → session theft on non-TLS
- Missing validation → business logic abuse and injection

## 3) Implementation status

- Helmet is enabled in `server.js`.
- `tests/security.test.js` currently only checks client-side XSS sanitization.

## 4) Testing

- Add Supertest integration tests for:
  - session cookie flags
  - server-side validation rejects invalid payloads
  - rate limiting works

## 5) Guidelines

- Never rely on client-side sanitization for security.
- Treat all user content as untrusted.

## 6) Checklist / Deployment

- Checklist: `docs/SECURITY_REVIEW_CHECKLIST.md`
- Deployment: `docs/DEPLOYMENT.md`

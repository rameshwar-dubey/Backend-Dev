# ConnectHub — Security Report (practice)

## 1) Vulnerabilities to guard against

- **IDOR/BOLA**: accessing other users’ profiles/messages by changing URL params
- **XSS**: stored/reflected XSS via posts, bios, messages
- **MongoDB injection**: `$ne/$gt` operator injection in filters
- **Brute force**: unlimited login attempts
- **Session weaknesses**: long-lived sessions, insecure cookie flags
- **CORS misconfig**: wildcard origins with credentials

## 2) Threat model (exploit + impact)

- **IDOR** → data exposure (messages, private profiles)
- **XSS** → session theft, account takeover, malware links
- **Injection** → authz bypass, unintended data reads/writes
- **Brute force** → account takeover at scale

## 3) Implementation summary

- Validation + sanitization: `middleware/validate.js`, `middleware/sanitizeRequest.js`, `utils/sanitizers.js`
- Auth/session hardening: `middleware/auth.js`, `server.js` session config
- Mongo injection defense: sanitization middleware and safe query patterns
- Security headers: Helmet in `server.js`
- Regression tests: `tests/security.test.js`

## 4) Testing

- Run `npm test`
- Tests should cover: XSS sanitization, authz scoping, injection payload rejection, session cookie flags, rate limiting.

## 5) Guidelines

- Scope all reads/writes by authenticated user id.
- Never store/render unsanitized HTML.
- Reject unknown input fields; validate type/length.
- Don’t leak stack traces or DB errors.

## 6) Code review checklist

See `docs/SECURITY_REVIEW_CHECKLIST.md`.

## 7) Deployment guide

See `docs/DEPLOYMENT.md`.

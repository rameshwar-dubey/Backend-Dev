# ShopEasy Security Audit Scaffold

## Status

This folder contains a minimal Express app used for security-audit practice. It currently has basic Helmet usage and session wiring, but it is **not** production-ready yet.

## What to add for a complete security package

- Strong session secret via env var (no hard-coded secrets)
- Secure cookies in production (`Secure`, `SameSite`)
- Input validation (Zod) and Mongo injection mitigation
- Rate limiting for auth and write endpoints
- Centralized safe error handler
- Authorization checks to prevent IDOR

## Tests

- `tests/security.test.js` should be expanded to cover server-side protections.

## Docs

- `SECURITY.md` and `docs/*` describe the required security measures.

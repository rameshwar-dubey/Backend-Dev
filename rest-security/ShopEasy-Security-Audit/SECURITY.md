# ShopEasy API Security Notes

## Current gaps (to fix before production)

- Session secret is hard-coded (must come from env/secret manager)
- Cookie `secure` is disabled (must be enabled behind HTTPS in production)
- Missing input validation and centralized error handling
- Missing authorization checks (IDOR risk)
- Missing rate limiting for sensitive endpoints

## Recommended controls

- Helmet + strict CSP (as appropriate for your frontend)
- `express-rate-limit` for auth + write routes
- Zod validation for all routes
- `express-mongo-sanitize` to block operator injection
- Sanitization/escaping for any user content rendered in UI/emails
- Generic error messages; detailed logs only server-side

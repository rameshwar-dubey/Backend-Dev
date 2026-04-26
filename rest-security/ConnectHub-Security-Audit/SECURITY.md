# ConnectHub API Security Notes

## Input validation & sanitization

- Validate all incoming payloads with strict schemas (e.g., Zod).
- Sanitize before storing to DB (store sanitized versions of content).
- Use different sanitizers per field:
  - `username/email`: normalize + strict validation
  - `bio/messages/comments`: plain text only (strip tags + escape)
  - `posts`: allow-list HTML tags (`b`, `i`, `em`, `strong`, `a`) and block scripts/unsafe URLs
  - `profile/avatar URLs`: require `https://`, reject localhost/private IPs

## XSS

- Never trust user-generated content.
- Store sanitized content (especially posts) and return that to clients.
- Prefer allow-lists over block-lists.

## Sessions

- Use `connect-mongo` with a TTL (e.g., 30 minutes) so sessions don’t live forever.
- Set cookies:
  - `httpOnly: true`
  - `sameSite: 'lax'` (or `'none'` + `secure: true` if cross-site cookies are required)
  - `secure: true` in production

## CORS

- Use an allow-list of origins from environment variables.
- Enable `credentials: true` only when using cookie-based auth.

## Other hardening

- Use Helmet.
- Apply rate limiting to auth routes.
- Remove Mongo operator injection from user input (`mongo-sanitize`).

# ConnectHub Security Audit Scaffold

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. Install deps: `npm install`
3. Run dev server: `npm run dev`

## Security highlights
- Zod validation per route
- Central request sanitization (`mongo-sanitize` + trimming)
- Field-specific sanitizers (plain text, limited HTML, safe URLs)
- Secure sessions via `express-session` + `connect-mongo` TTL
- Helmet + CORS allow-list + rate limiting

See `SECURITY.md` for best practices.

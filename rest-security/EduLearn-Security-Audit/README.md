# EduLearn Security Audit Scaffold

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install deps: `npm install`
3. Run: `npm run dev`

## Features implemented

- Auth with roles (Student/Instructor/Admin), password requirements, secure hashing
- Instructor MFA (TOTP) setup + verify + enforced on login
- Secure sessions stored in MongoDB via `connect-mongo` with TTL
- Input validation (Zod) + request sanitization (`mongo-sanitize` + trims)
- Rich text allow-list sanitization for course descriptions (XSS protection)
- Rate limiting for login and quiz submissions
- File upload security: size + MIME detection + safe filenames + secure retrieval
- Helmet + conservative CSP configuration for S3/Stripe/analytics/embeds
- Structured request logging (Pino)

See `SECURITY.md`, `LOGGING_MONITORING.md`, and `DISASTER_RECOVERY.md`.

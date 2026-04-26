# MediBook Security Audit Scaffold

## Setup

1. Copy `.env.example` to `.env` and set `DATA_ENCRYPTION_KEY_BASE64`.
2. Install deps: `npm install`
3. Run: `npm run dev`

## What this implements

- Secure auth + role-based access control
- Mongo-backed sessions with short TTL
- Input validation + sanitization and Mongo operator injection defense
- Encrypted storage for medical records/PII fields and encrypted document uploads
- Audit logging for sensitive access

See `SECURITY.md`.

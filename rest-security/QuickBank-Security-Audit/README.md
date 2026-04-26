# QuickBank — Security Audit Implementation

Practice Problem 5: Banking Transaction System

## Quick start

1. Create `.env` from `.env.example`
2. Install deps: `npm install`
3. Start MongoDB locally
4. Run: `npm run dev`

## Core endpoints (high level)

- Auth: `/auth/*`
- Accounts: `/accounts/*`
- Transactions: `/transactions/*`
- Beneficiaries: `/beneficiaries/*`
- Loans: `/loans/*`

## Security features

- Session-based auth using `express-session` + `connect-mongo` (encrypted at rest in store)
- Brute force protection + user lockout on repeated failures
- Session invalidation across devices via `sessionVersion`
- Step-up 2FA (TOTP) required for transactions above $1,000
- WebAuthn support (platform authenticators / biometrics) for mobile apps
- Strict validation (Zod) + mongo operator sanitization
- Sanitized transaction descriptions and beneficiary names
- Endpoint-specific rate limits (stricter for financial operations)
- Centralized safe error handling (no DB structure leakage)
- Audit logging for sensitive actions

## Running tests

- `npm test`

## Docs

- PCI checklist: `docs/PCI_DSS.md`
- Incident response plan: `docs/INCIDENT_RESPONSE.md`

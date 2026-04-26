# PCI DSS readiness notes (practice)

QuickBank is a banking platform (accounts/transfers), not a card processor by default. If the platform ever stores/processes PAN/CVV, PCI DSS scope expands significantly.

## Scope control (recommended)

- Do not collect/store PAN, CVV, or track data.
- Use a PCI-compliant payment processor/tokenization provider for any card flows.
- If cards are required, store only tokens + last4 + brand.

## Key controls implemented in this project

- Strong authentication and session management
  - Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
  - Server-side sessions stored in MongoDB with `connect-mongo` encryption (`store.crypto.secret`).
  - Session invalidation across devices via `User.sessionVersion`.
  - Brute force defenses (rate limiting + lockouts).
- Encryption
  - Sensitive identifiers (beneficiary account numbers) stored encrypted at rest (AES-256-GCM).
- Secure coding
  - Strict input validation using Zod.
  - MongoDB operator injection mitigation via `express-mongo-sanitize`.
  - Output sanitization for user-controlled text used in notifications.
- Monitoring
  - Audit logging for authentication and financial actions.

## Remaining PCI DSS work (what you would do in a real launch)

- Network segmentation + firewall rules (restrict DB access, private subnets).
- Centralized log retention + tamper resistance (WORM storage / SIEM).
- Formal vulnerability management process (SAST/DAST, patch SLAs).
- Key management/HSM, key rotation, and secrets management.
- Documented access control policies, least privilege, and periodic access reviews.
- Quarterly ASV scans, penetration tests, and change control.
- Incident response playbooks tied to cardholder data procedures (if in scope).

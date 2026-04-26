# MediBook — Security Report (HIPAA-oriented practice)

## 1) Vulnerabilities to guard against

- **IDOR/BOLA**: accessing other patients’ records by ID
- **Broken RBAC**: patients hitting doctor/admin routes
- **Mongo injection**: operator payloads in filters
- **XSS**: notes/messages fields
- **Insecure uploads**: malicious PDFs/images, oversized uploads
- **Weak audit trail**: missing access logs for PHI
- **Sensitive data exposure**: logs/errors leaking PHI or DB structure

## 2) Threat model (exploit + impact)

- IDOR/RBAC failures → PHI exposure (regulatory risk)
- Upload abuse → malware, data exfil, storage DoS
- Missing audit logs → undetected unauthorized access

## 3) Implementation summary

- Auth/RBAC: `middleware/auth.js`
- Validation/sanitization: `middleware/validate.js`, `middleware/sanitizeRequest.js`, `utils/sanitizers.js`
- Injection protection: global request sanitization + safe query patterns
- Encryption helpers: `utils/crypto.js`
- Audit logging: `middleware/audit.js`, `models/AuditLog.js`
- Tests: `tests/security.test.js`

## 4) Testing

- Verify: record access scoping, role enforcement, upload validation, audit log creation, safe error responses.

## 5) Guidelines

- Default-deny access to PHI; always scope by patient + actor role.
- Never log PHI; redact fields.

## 6) Checklist / Deployment

- Checklist: `docs/SECURITY_REVIEW_CHECKLIST.md`
- Deployment: `docs/DEPLOYMENT.md`

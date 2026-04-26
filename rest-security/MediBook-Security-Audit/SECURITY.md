# MediBook Security Notes (HIPAA-oriented)

> This repo is a security-hardening scaffold, not a full HIPAA compliance program.

## 1) Authentication & RBAC

- Strong password policy (min 12, mixed classes).
- Roles: Patient, Doctor, Nurse, Admin, Insurance.
- Authorization checks prevent IDOR (no access by changing URL params).

## 2) Session security

- Sessions stored in MongoDB with TTL.
- Short idle timeout (`SESSION_TTL_SECONDS`, default 15 min).
- Cookie: `httpOnly`, `sameSite=lax`, `secure` in production.

## 3) Input validation & sanitization

- Zod validation for bodies.
- Global request sanitization: `mongo-sanitize` blocks operator injection.
- Medical text fields are stored as text-only (tags stripped then escaped).

## 4) MongoDB injection

- No direct use of untrusted objects in query filters.
- Search endpoints accept only strings + safe regex built from escaped input.

## 5) Encryption

- Sensitive data at rest encrypted with AES-256-GCM (`DATA_ENCRYPTION_KEY_BASE64`).
- Encrypted uploads on disk; DB stores only ciphertext metadata.
- In transit: run behind HTTPS; set `secure` cookies and enforce HTTPS in production.

## 6) Audit logging

- Audit logs for medical record read and document upload/download.
- Log includes actor, role, resource, patient, IP/UA, status.

## 7) Upload security

- Validates via magic bytes (PDF/JPEG/PNG + DICOM detection).
- Enforces size limits.
- Malware scan stub is present; integrate a real scanner in production.

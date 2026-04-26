# EduLearn — Security Review Checklist

- RBAC checks on admin/instructor endpoints
- Ownership/enrollment checks on course/material access
- Zod validation for all inputs and query params
- `mongo-sanitize` (or equivalent) enabled
- File upload validation (magic bytes), size limits, safe filenames
- XSS sanitization for rich text
- Session cookies: `HttpOnly`, `SameSite`, `Secure` in production
- Rate limit login and quiz submissions
- Safe error responses (no stack/DB leakage)

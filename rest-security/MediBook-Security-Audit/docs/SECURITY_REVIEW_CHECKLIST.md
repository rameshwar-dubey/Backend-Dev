# MediBook — Security Review Checklist

- RBAC checks for all role-specific routes
- All PHI access scoped to authorized actor + patient
- Validation (Zod) for bodies/query/params
- Mongo operator injection mitigation enabled
- Upload validation (magic bytes), size limits, malware scanning integration
- Encryption at rest for sensitive fields
- Audit logs for read/write/download of PHI
- Errors and logs do not leak PHI or internals

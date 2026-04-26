# ConnectHub — Security Review Checklist

- Auth required on all private routes
- All queries scoped to the authenticated user
- Zod validation on every endpoint
- Mongo operator injection protection enabled
- XSS defenses: sanitize stored content and escape output
- Sessions: TTL, `HttpOnly`, `SameSite`, `Secure` in production, regenerate on login
- CORS allow-list and `credentials` only when needed
- Rate limit auth endpoints
- Errors do not leak stack/DB internals

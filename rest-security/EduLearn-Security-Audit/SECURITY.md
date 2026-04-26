# EduLearn API Security Notes

## Auth & Authorization

- Role-based access: Student, Instructor, Admin.
- Always scope instructor dashboards by `instructorId` to prevent cross-tenant leaks.
- Enforce enrollment checks before allowing access to premium/materials/quizzes.

## Sessions

- Use `express-session` with `connect-mongo` store and TTL (e.g., 30 min) so sessions expire.
- Cookie settings:
  - `httpOnly: true`
  - `sameSite: 'lax'` (or `'none'` + `secure: true` if cross-site cookies required)
  - `secure: true` in production

## Input sanitization

- Use schema validation (Zod) for every endpoint.
- Sanitize before storing:
  - Profiles/messages/quiz text: plain text only.
  - Course descriptions: strict allow-list HTML via `sanitize-html`.

## XSS

- Never render untrusted HTML without sanitizing.
- Prefer allow-lists over block-lists.

## Rate limiting

- Login: strict limiter to mitigate brute force.
- Quiz submissions: limiter to reduce abuse.

## Upload security

- Validate by magic bytes (not extensions).
- Enforce size limits.
- Scan uploads using a malware scanning pipeline (ClamAV / object-store AV events).
- Serve files only through auth-checked routes.

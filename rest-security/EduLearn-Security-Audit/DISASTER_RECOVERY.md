# Disaster Recovery Plan (DB + Sessions)

## Goals

- Minimize data loss (RPO) and downtime (RTO).

## Backups

- MongoDB:
  - Daily full backup + hourly incremental/oplog (depending on deployment).
  - Store backups encrypted and in a separate account/project.
  - Regular restore drills (at least monthly).

## Restore procedure (high level)

1. Freeze writes (maintenance mode).
2. Restore latest full backup.
3. Apply increments/oplog to target point-in-time.
4. Validate critical collections: users, courses, enrollments, quizzes, submissions, materials.
5. Bring API back online.

## Session management

- Sessions are stored in Mongo with TTL.
- During restore, consider invalidating sessions by:
  - rotating `SESSION_SECRET` (forces re-login)
  - or clearing session collection if you suspect compromise

## File uploads

- Prefer object storage (S3) with versioning + lifecycle policies.
- If using local disk in dev, treat it as ephemeral.

## Incident playbooks

- Account compromise:
  - force logout by rotating `SESSION_SECRET`
  - reset passwords, require MFA for instructors
- Malicious uploads:
  - quarantine suspected objects
  - re-scan, block hashes, audit access logs

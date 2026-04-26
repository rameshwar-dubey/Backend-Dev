# Security Incident Response Plan (practice)

## Objectives

- Contain threats quickly, protect customer funds/data, and restore service safely.
- Preserve evidence for investigation and compliance reporting.

## Roles

- Incident Commander (IC): owns timeline, coordination, decisions.
- Security Lead: triage, root cause analysis, mitigations.
- Engineering Lead: deploy hotfixes, rollback, infra changes.
- Compliance/Legal: regulatory notifications, customer communications.
- Support Lead: customer impact handling.

## Severity

- Sev-1: active fraud/data exfiltration or widespread account takeover.
- Sev-2: limited compromise or high-risk vulnerability with credible exploit.
- Sev-3: suspicious activity with no confirmed impact.

## Detection signals

- Spike in failed logins / lockouts.
- High-value transaction anomalies (amount, velocity, new device).
- Error rate spikes, DB query anomalies.
- Audit log events: `SUSPICIOUS_NEW_DEVICE`, repeated `AUTH_LOGIN_FAILED`.

## Response workflow

1. Identify
   - Confirm event, gather indicators (IP/device fingerprint/user IDs).
   - Determine scope (accounts impacted, endpoints, timeframe).
2. Contain
   - Block abusive IPs, increase rate limits, disable risky endpoints if necessary.
   - Force logout by incrementing `sessionVersion` for affected users.
   - Freeze impacted accounts if fraud suspected.
3. Eradicate
   - Patch root cause (validation/authz/query sanitization).
   - Rotate secrets/keys if exposure is suspected.
4. Recover
   - Gradually restore services; monitor error rates and fraud indicators.
   - Require step-up authentication for high-risk actions.
5. Post-incident
   - Blameless RCA, add regression tests, update runbooks.
   - Review and improve monitoring and alerting.

## Evidence handling

- Preserve application logs, audit logs, relevant DB snapshots, and deployment history.
- Record exact UTC timestamps and hashes of exported evidence where possible.

## Communications

- Internal: IC sends updates on fixed cadence (e.g., every 30 minutes for Sev-1).
- External: coordinate with compliance/legal for customer and regulator notices.

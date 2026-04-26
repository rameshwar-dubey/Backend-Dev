# Logging & Monitoring (Production Readiness)

## Logging

- Use structured JSON logs (Pino) for:
  - request start/end (method, path, status, latency)
  - auth events (login success/failure, MFA required)
  - suspicious patterns (rate limit hits, validation errors)
- Never log secrets:
  - passwords, session cookies, MFA tokens, Stripe secrets

## Monitoring

- Add health endpoints:
  - `/health` for liveness
- Track:
  - error rate, latency p95/p99
  - login failures and rate limiter blocks
  - upload rejects by MIME/size

## Alerts

- Page on spikes in 401/403/429/500.
- Alert on repeated login failures for same account/IP.

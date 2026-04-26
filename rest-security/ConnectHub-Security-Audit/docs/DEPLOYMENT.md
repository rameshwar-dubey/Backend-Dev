# ConnectHub — Production Deployment Guide (security)

## Required settings

- `NODE_ENV=production`
- Strong session secret (`SESSION_SECRET`)
- MongoDB restricted to private network; auth enabled

## HTTPS

- Terminate TLS at a load balancer/reverse proxy.
- Set cookies `Secure` in production.

## Headers and CORS

- Helmet enabled
- CORS allow-list only; avoid `*` when using cookies

## Operations

- Centralize logs
- Monitor failed logins, rate-limit blocks, and authz failures
- Run `npm test` in CI

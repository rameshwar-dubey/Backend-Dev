# ShopEasy — Production Deployment Guide (security)

- Use HTTPS in production
- Session secret must come from a secret manager / env var
- Enable `Secure` cookies behind TLS
- Add rate limiting and server-side validation
- Restrict MongoDB access to private network
- Run tests in CI

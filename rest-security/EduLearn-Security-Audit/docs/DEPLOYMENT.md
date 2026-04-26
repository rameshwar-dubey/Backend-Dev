# EduLearn — Production Deployment Guide (security)

- Enforce `NODE_ENV=production`
- Run behind HTTPS and set `Secure` cookies
- Configure Helmet + CSP (see `config/helmet.js`)
- Store secrets in a secret manager (not `.env`)
- Restrict MongoDB access to private networks
- Monitor login failures, MFA failures, upload rejects, and rate-limit blocks
- Use malware scanning for uploads in production

# ShopEasy — Security Review Checklist

- No hard-coded secrets
- Helmet enabled and configured
- Validation for all routes
- Mongo injection protection enabled
- Auth + authorization checks prevent IDOR
- Rate limiting on auth and write endpoints
- Safe errors (no internals leaked)
- Tests cover the above

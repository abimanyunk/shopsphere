# Security

## Implemented controls

- Runtime configuration is validated before the server starts.
- Secrets have no source-controlled default values.
- Helmet sets baseline HTTP security headers.
- Credentialed CORS accepts one explicitly configured browser origin.
- JSON request bodies are limited to 100 KB.
- Pino redacts authorization, cookies, password fields, tokens, session IDs, and set-cookie values.
- Errors hide stack traces and internal details in production.
- Prisma uses parameterized database access.
- Database and Redis development ports bind only to `127.0.0.1`.
- npm audit currently reports no known vulnerabilities.
- Passwords use Argon2id with explicit memory, time, and parallelism costs.
- Opaque 256-bit session tokens use `HttpOnly`, `SameSite=Lax` cookies and rotate after
  authentication; only HMAC-derived identifiers are used as Redis keys.
- Production cookies require HTTPS through the `Secure` flag.
- State-changing requests require a double-submit CSRF token; authenticated tokens are also bound
  to the Redis session and rotate during authentication.
- Login and registration are Redis-rate-limited without storing raw client addresses.
- Login failures do not reveal whether an account exists.
- Authentication reloads active status and role from PostgreSQL on each request.
- Browser authentication tokens are never stored in localStorage.
- Product and category inputs use strict allowlist schemas; prices use bounded decimal strings and
  inventory is restricted to non-negative integers at both API and database layers.
- Product image URLs accept only HTTP and HTTPS protocols.
- Admin catalogue mutations require authentication, the `ADMIN` role, and session-bound CSRF.
- Cart and order resources are always scoped to the authenticated user; foreign identifiers return
  not-found responses rather than revealing ownership.
- Checkout ignores client prices, recalculates totals from locked database rows, and stores
  immutable product and price snapshots.
- Simulated payment requests accept no card or banking data and are explicitly labelled
  `SIMULATED` throughout the API and database.

## Secret handling

`.env` and all `.env.*` files are ignored except `.env.example`. Real credentials must come from
the environment or a future secret manager. Never commit local, test, CI, or production secrets.

Report dependency findings with `npm audit`; do not use forced automatic major upgrades without
reviewing behavior and rerunning all checks.

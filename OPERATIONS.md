# Operations

## Ports and dependencies

- Backend: TCP 4000 by default, binds `0.0.0.0`
- Frontend dev server: TCP 5173
- Frontend preview: TCP 4173
- PostgreSQL: TCP 5432, host loopback only in development
- Redis: TCP 6379, host loopback only in development

The backend requires PostgreSQL and Redis for readiness. Redis stores revocable sessions,
authentication rate-limit counters, and short-lived versioned catalogue entries. PostgreSQL remains
authoritative. Compose health checks use `pg_isready` and `redis-cli ping`.

Checkout and cancellation invalidate the catalogue cache generation after inventory commits.
Interactive database transactions use bounded wait and execution timeouts. HTTP request timeouts
should be configured above those transaction bounds in the future reverse-proxy phase.

## Health semantics

`/health/live` returns 200 while the Node process can serve requests. It deliberately does not
query dependencies. `/health/ready` runs bounded PostgreSQL and Redis checks and returns 503 if
either is unavailable. It does not expose hostnames, credentials, or raw errors.

## Logging

Production logs are newline-delimited JSON. Development logs are human-readable. Request logs
contain timestamp, level, request ID, method, path, response status, and duration. Sensitive header
and body fields are redacted.

## Shutdown

SIGTERM and SIGINT stop new HTTP connections and allow active work to finish. The configured
shutdown timer bounds the drain; Prisma and Redis connections close before exit. Orchestrators
should provide a termination grace period longer than `SHUTDOWN_TIMEOUT_MS`.

## Useful commands

- Start dependencies: `docker compose -f compose.dev.yml up -d --wait`
- Inspect dependencies: `docker compose -f compose.dev.yml ps`
- Stop dependencies: `docker compose -f compose.dev.yml down`
- Follow dependency logs: `docker compose -f compose.dev.yml logs -f`

Do not use `down --volumes` unless intentionally deleting local development data.

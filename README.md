# ShopSphere

ShopSphere is a DevOps-ready e-commerce learning application. It uses a modular monolith backend
and a separately built React frontend so later phases can focus on containers, CI/CD, cloud
infrastructure, Kubernetes, metrics, and centralized logs without first untangling the application.

## Current status

Phases 1 through 6 are implemented and operationally reviewed: the foundation, authentication and authorization,
customer profiles, product and category management, persistent carts, transactional checkout,
simulated payments, order history and cancellation, inventory safety, Redis catalogue caching, and
environment-driven sample seeding. The responsive React storefront now covers browsing, account,
cart, checkout, and order journeys; the administrator console covers metrics, products, inventory,
and fulfilment.

The latest verification evidence is recorded in [QUALITY.md](QUALITY.md).

## Stack

- Node.js 24 and npm workspaces
- Express 5, TypeScript 5.9, Zod, Pino
- Prisma 7 and PostgreSQL 17
- Redis 8
- React 19, React Router 7, Vite 8
- Vitest, Supertest, React Testing Library, ESLint, and Prettier

Exact versions are pinned in the package manifests and `package-lock.json`.

## Architecture

The Express API is a modular monolith. Business modules live under `backend/src/modules`; shared
configuration, database, cache, logging, and middleware are separate. The React client is an
independently buildable static application under `frontend`.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [DATABASE.md](DATABASE.md).

## Prerequisites

- Node.js `>=24.11.0`
- npm `>=11`
- Docker Desktop with Docker Compose

PostgreSQL and Redis do not need to be installed on the host.

## Local development

1. Install the locked dependencies: `npm ci`
2. Copy `.env.example` to `.env` and replace all placeholder values.
3. Start dependencies: `docker compose -f compose.dev.yml up -d --wait`
4. Generate Prisma Client: `npm run db:generate`
5. Apply migrations: `npm run db:migrate`
6. Start the backend: `npm run dev:backend`
7. In another terminal, start the frontend: `npm run dev:frontend`

The frontend is at `http://localhost:5173`; the API defaults to `http://localhost:4000`.
PostgreSQL and Redis bind only to host loopback addresses in the development Compose file.

To prepare the local development administrator and sample catalogue, set `DEV_ADMIN_EMAIL` and
`DEV_ADMIN_PASSWORD` in your private `.env`, then run `npm run db:seed`. The idempotent seed refuses
production mode and never contains a default password.

## Verification

```text
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Authentication integration tests use a separate test database and Redis database and refuse an
unsafe database name. See [DEVELOPMENT.md](DEVELOPMENT.md).

## Database migrations

- Apply all committed migrations: `npm run db:migrate`
- Regenerate Prisma Client: `npm run db:generate`
- Validate the schema: `npm run db:validate --workspace @shopsphere/backend`

Schema authors should create new migrations deliberately with `prisma migrate dev`, inspect the
generated SQL, and preserve the custom PostgreSQL trigram indexes. Normal local and production-like
startup uses the non-interactive `prisma migrate deploy` command.

## API and health checks

- OpenAPI document: `GET http://localhost:4000/openapi.json`
- Swagger UI: `GET http://localhost:4000/docs`
- Liveness: `GET http://localhost:4000/health/live`
- Readiness: `GET http://localhost:4000/health/ready`

Liveness checks only the process. Readiness checks PostgreSQL and Redis with bounded timeouts and
returns HTTP 503 without infrastructure details when a dependency is unavailable.

## Local versus future production

Local development runs the application processes on the host and dependencies in Compose.
Production Dockerfiles, reverse proxy configuration, AWS resources, Terraform, Kubernetes, and
observability infrastructure are deliberately not part of this phase. Runtime behavior is already
environment-driven and the backend binds to `0.0.0.0`, making those later changes straightforward.

Additional guidance: [SECURITY.md](SECURITY.md), [OPERATIONS.md](OPERATIONS.md),
[ENVIRONMENT.md](ENVIRONMENT.md), [QUALITY.md](QUALITY.md), and [API.md](API.md).

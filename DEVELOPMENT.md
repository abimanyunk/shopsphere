# Development

## First-time setup

Use Node.js and npm versions compatible with the root `engines` declaration. Run `npm ci`,
create a private `.env` from `.env.example`, start Compose dependencies, generate Prisma Client,
and apply migrations as described in the README.

## Workspace commands

- `npm run dev:backend`: watch the Express backend
- `npm run dev:frontend`: run Vite with network binding suitable for containers
- `npm test`: run all backend and frontend tests once
- `npm run typecheck`: check both TypeScript projects
- `npm run lint`: lint the repository
- `npm run format`: apply Prettier
- `npm run build`: compile both production artifacts

## Change discipline

- Put business logic in services, not routes or controllers.
- Validate every untrusted input with an explicit schema.
- Add or update OpenAPI alongside an endpoint.
- Add migration files for every schema change; never edit an already deployed migration.
- Use `npm run db:migrate` to apply committed migrations. When authoring a new migration, run
  `prisma migrate dev` deliberately and review its SQL so custom database indexes are preserved.
- Add tests for success, validation, authorization, and failure behavior.
- Do not log request credentials or sensitive business data.

## Test isolation

Foundation tests inject dependency checks. Authentication, catalogue, cart, and order integration
tests require a dedicated PostgreSQL test database and isolated Redis database. The suites validate
the target before cleanup and refuse any database whose name does not end in `_test`. Integration
test files run serially so their cleanup cannot overlap. The commerce suite includes a real
concurrent last-unit checkout test to detect overselling regressions.

After starting Compose, create the test database once:

```text
docker exec shopsphere-dev-postgres-1 createdb -U shopsphere shopsphere_test
```

Set `TEST_DATABASE_URL` and `TEST_REDIS_URL` in your private `.env`, apply migrations using the test
URL, then run `npm test`. Redis database 1 is used by the example configuration and is flushed only
by authentication test setup and teardown.

## Phase boundaries

The application is intentionally developed in approved phases. A feature is documented as
implemented only after its code and tests exist and the tests have actually run.

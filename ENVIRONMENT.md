# Environment variables

All variables are shown in `.env.example`. Values below describe behavior, not deployable secrets.

| Variable                         | Required | Purpose                                                         |
| -------------------------------- | -------- | --------------------------------------------------------------- |
| `NODE_ENV`                       | No       | `development`, `test`, or `production`; defaults to development |
| `HOST`                           | No       | Backend bind address; defaults to `0.0.0.0`                     |
| `PORT`                           | No       | Backend TCP port; defaults to 4000                              |
| `LOG_LEVEL`                      | No       | Pino log level; defaults to info                                |
| `DATABASE_URL`                   | Yes      | PostgreSQL connection URL                                       |
| `REDIS_URL`                      | Yes      | Redis connection URL                                            |
| `SESSION_SECRET`                 | Yes      | Minimum 32-character HMAC secret                                |
| `CORS_ORIGIN`                    | Yes      | Exact browser origin permitted to send credentials              |
| `SHUTDOWN_TIMEOUT_MS`            | No       | Maximum graceful shutdown duration; defaults to 10000           |
| `DEPENDENCY_TIMEOUT_MS`          | No       | Per-readiness-check timeout; defaults to 2000                   |
| `SESSION_TTL_SECONDS`            | No       | Redis session and cookie lifetime; defaults to seven days       |
| `AUTH_RATE_LIMIT_MAX`            | No       | Authentication attempts allowed per rate-limit window           |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | No       | Authentication rate-limit window                                |
| `CATALOG_CACHE_TTL_SECONDS`      | No       | Public catalogue cache lifetime; defaults to 60 seconds         |
| `LOW_STOCK_THRESHOLD`            | No       | Inclusive dashboard low-stock threshold; defaults to 5          |
| `DEV_ADMIN_EMAIL`                | Seed     | Local development administrator email                           |
| `DEV_ADMIN_PASSWORD`             | Seed     | Local administrator password; minimum 12 characters             |
| `VITE_API_URL`                   | Frontend | Browser-visible base URL for versioned business APIs            |
| `TEST_DATABASE_URL`              | Tests    | Isolated database whose name must end in `_test`                |
| `TEST_REDIS_URL`                 | Tests    | Isolated Redis database or instance                             |

Vite embeds `VITE_` variables into frontend assets. Never place secrets in any `VITE_` variable.

Configuration errors list invalid field names but never echo their values. Production must inject
values through its runtime environment or future secret-management integration.

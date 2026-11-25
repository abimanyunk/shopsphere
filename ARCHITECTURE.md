# Architecture

## System shape

ShopSphere is a modular monolith with two deployable build artifacts:

1. A React single-page application compiled into static assets.
2. An Express REST API containing all business modules in one process.

PostgreSQL is the system of record. Redis supports sessions, authentication rate limits, and
catalogue caching; it never owns products, orders, payments, or inventory.

## Backend boundaries

Each business module uses routes, validation, controllers, services, and data-access functions.
Routes handle composition, controllers translate HTTP input/output, services enforce business
rules, and repositories isolate persistence. Cross-cutting middleware provides request IDs,
logging, authentication, authorization, and error translation.

Implemented shared components:

- `config`: Zod-validated environment configuration
- `database`: Prisma client factory using the PostgreSQL driver adapter
- `cache`: Redis client factory
- `logger`: production JSON and local pretty logging with redaction
- `middleware`: request logging and centralized errors
- `modules/health`: dependency-independent liveness and dependency-aware readiness
- `docs`: OpenAPI source document

Implemented business modules:

- `auth`: Argon2id credentials, session lifecycle, CSRF, login, registration, and logout
- `users`: profile persistence, public-user mapping, and profile updates
- `categories`: public listing plus administrator creation, updates, and deactivation
- `products`: catalogue queries, product detail, admin CRUD, and inventory management
- `cart`: persistent customer cart, ownership enforcement, totals, and stock validation
- `orders`: transactional checkout, simulated payments, history, detail, and cancellation
- `admin`: operational metrics plus global order listing and fulfilment controls

Opaque 256-bit session tokens are held only by the browser. Redis keys use HMAC-derived token
identifiers, and stored session records contain only a user ID and HMAC-derived CSRF token. Session
authentication reloads the user from PostgreSQL so deactivation and role changes take effect
without waiting for session expiry.

Public catalogue results use short-lived, versioned Redis keys. Every catalogue mutation increments
the version rather than scanning Redis for matching keys. Entries from previous versions become
unreachable immediately and expire naturally. Cache failure falls back to PostgreSQL and is logged.

Checkout locks the customer cart and affected product rows in deterministic order inside one
PostgreSQL transaction. It reloads current products, validates stock, calculates prices server-side,
writes immutable order-item snapshots, updates inventory, records the simulated payment, and clears
the cart. Cancellation locks the order and products, restores stock exactly once, and marks a
successful simulated payment as refunded.

## Request lifecycle

A request receives a caller-supplied bounded request ID or a generated UUID. Security headers,
CORS, and JSON size limits are applied before routing. Errors flow to one final translator and use
a consistent JSON shape. Pino records method, path, response status, duration, and request ID while
redacting credentials and session material.

## Runtime lifecycle

The backend listens on an environment-configured host and port. SIGTERM and SIGINT stop accepting
connections, wait for in-flight requests within a configured bound, then close Prisma and Redis.
Fatal process errors enter the same shutdown path.

## Frontend boundaries

The React client separates API access, authenticated user and cart state, reusable presentation
components, route guards, and customer/admin page modules. Session material stays in HTTP-only
cookies; the CSRF value is held in memory and refreshed through the API. Customer routes cover the
catalogue through post-purchase history, while role-guarded administrator routes cover catalogue,
stock, metrics, and fulfilment operations.

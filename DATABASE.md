# Database

ShopSphere uses PostgreSQL through Prisma. The initial migration creates users, categories,
products, carts, cart items, orders, order items, and payments, plus the required enums, foreign
keys, unique constraints, and query indexes.

## Core invariants

- Emails and product SKUs are unique.
- Money uses `DECIMAL(12,2)`, never floating-point values.
- Timestamps use PostgreSQL `TIMESTAMPTZ(3)` and are handled as UTC.
- One cart belongs to one user; one cart cannot contain duplicate product rows.
- Orders preserve shipping, product name, SKU, and price snapshots.
- Historical order product references use restrictive deletion behavior.
- User-cart deletion cascades; business history is restricted from accidental deletion.
- Products and categories support deactivation instead of destructive removal.

Positive quantities and non-negative monetary/inventory values are enforced by validated services
and database checks. Order state and cancellation eligibility are enforced by transactional service
rules.

The Phase 3 migration adds database checks preventing negative product prices and inventory. It
also enables PostgreSQL `pg_trgm` and GIN indexes for case-insensitive name, description, and SKU
substring search.

The Phase 4 migration adds database checks for positive cart and order-item quantities and
non-negative order, payment, unit-price, and line-total values. Checkout and cancellation use row
locks and database transactions so inventory, orders, payments, and cart cleanup succeed or fail as
one operation.

## Migrations

The checked-in migration directory is the reproducible database history. Developers create new
migrations with `npm run db:migrate`; deployment environments will apply them with
`prisma migrate deploy`.

Never point test commands at the development database. Later integration-test setup will require a
database name ending in an explicitly documented test suffix and will refuse unsafe targets.

## Seed policy

The seed creates or updates a development administrator only from explicit `DEV_ADMIN_EMAIL` and
`DEV_ADMIN_PASSWORD` values. It refuses production mode, hashes the supplied password with
Argon2id, and never logs it. The same idempotent development seed upserts three categories and six
sample products. Production will never receive a default password or development catalogue seed.

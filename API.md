# API

ShopSphere exposes JSON REST endpoints. Business APIs use the `/api/v1` prefix. Operational and
documentation routes are unversioned because they describe the running process.

## Implemented endpoints

| Method | Path                                          | Purpose                                            |
| ------ | --------------------------------------------- | -------------------------------------------------- |
| GET    | `/health/live`                                | Process liveness                                   |
| GET    | `/health/ready`                               | PostgreSQL and Redis readiness                     |
| GET    | `/openapi.json`                               | OpenAPI 3.1 document                               |
| GET    | `/docs`                                       | Interactive Swagger UI                             |
| GET    | `/api/v1/auth/csrf`                           | Issue or rotate a CSRF token                       |
| POST   | `/api/v1/auth/register`                       | Register and start a customer session              |
| POST   | `/api/v1/auth/login`                          | Start a customer or administrator session          |
| POST   | `/api/v1/auth/logout`                         | Revoke the current session                         |
| GET    | `/api/v1/auth/session`                        | Read the authenticated user                        |
| GET    | `/api/v1/users/me`                            | Read the current profile                           |
| PATCH  | `/api/v1/users/me`                            | Update the current profile                         |
| GET    | `/api/v1/admin/session`                       | Verify administrator authorization                 |
| GET    | `/api/v1/categories`                          | List active categories                             |
| GET    | `/api/v1/products`                            | Search, filter, sort, and paginate active products |
| GET    | `/api/v1/products/:productId`                 | Read active product details                        |
| GET    | `/api/v1/admin/categories`                    | List all categories                                |
| POST   | `/api/v1/admin/categories`                    | Create a category                                  |
| PATCH  | `/api/v1/admin/categories/:categoryId`        | Update or deactivate a category                    |
| GET    | `/api/v1/admin/products`                      | List active and inactive products                  |
| POST   | `/api/v1/admin/products`                      | Create a product                                   |
| PATCH  | `/api/v1/admin/products/:productId`           | Update a product                                   |
| PATCH  | `/api/v1/admin/products/:productId/inventory` | Set stock quantity                                 |
| DELETE | `/api/v1/admin/products/:productId`           | Deactivate a product                               |
| GET    | `/api/v1/cart`                                | View the authenticated customer cart               |
| POST   | `/api/v1/cart/items`                          | Add a product to the cart                          |
| PATCH  | `/api/v1/cart/items/:itemId`                  | Set a cart item quantity                           |
| DELETE | `/api/v1/cart/items/:itemId`                  | Remove a cart item                                 |
| POST   | `/api/v1/orders/checkout`                     | Checkout with the simulated payment flow           |
| GET    | `/api/v1/orders`                              | List the customer's order history                  |
| GET    | `/api/v1/orders/:orderId`                     | Read an owned order                                |
| POST   | `/api/v1/orders/:orderId/cancel`              | Cancel an eligible order                           |
| GET    | `/api/v1/admin/dashboard`                     | Read operational dashboard metrics                 |
| GET    | `/api/v1/admin/orders`                        | Search and filter all orders                       |
| GET    | `/api/v1/admin/orders/:orderId`               | Read any order                                     |
| PATCH  | `/api/v1/admin/orders/:orderId/status`        | Advance or cancel an order                         |

Credentialed requests use the `shopsphere_session` cookie. POST, PATCH, and DELETE endpoints also
require an `x-csrf-token` header matching the `shopsphere_csrf` cookie. Clients obtain the initial
value from `GET /api/v1/auth/csrf`; successful registration and login responses return the rotated
value.

Product list query parameters are `page`, `limit`, `search`, `category`, `minPrice`, `maxPrice`,
`inStock`, and `sort`. Supported sort values are `newest`, `price_asc`, and `price_desc`. Money is
represented as a decimal string.

Checkout requires `payment.method` to be `SIMULATED` and an explicit `SUCCEEDED` or `FAILED`
outcome. Successful simulation confirms the order, decrements inventory, and clears the cart.
Failed simulation records a cancelled order and failed payment, returns HTTP 402, and leaves both
inventory and cart unchanged. No real payment credentials are accepted.

Success responses place payloads under `data`. Errors use:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /missing was not found",
    "requestId": "e8d8f3b3-..."
  }
}
```

Production responses omit debug details and stack traces. Dependency health failures name only the
dependency and its `up` or `down` status.

Administrator order transitions are deliberately linear: `PENDING` → `CONFIRMED` → `PROCESSING` →
`SHIPPED` → `DELIVERED`. Pending or confirmed orders can instead move to `CANCELLED`; cancellation
restores inventory and refunds a successful simulated payment.

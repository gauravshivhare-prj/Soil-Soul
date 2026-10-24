# REST API Conventions

## 1. Versioning

The backend's initial API prefix is:

```text
/api/v1
```

Mount feature routers through the root router. Avoid scattering unrelated path-prefix logic across modules.

## 2. HTTP semantics

- `GET`: read data; should not mutate state.
- `POST`: create a resource or perform a clearly defined action.
- `PATCH`: partially update a resource.
- `PUT`: replace a resource when full replacement semantics are intended.
- `DELETE`: remove or deactivate a resource according to documented rules.

Use plural resource names where natural, such as `/products` and `/orders`.

## 3. Status codes

Use appropriate HTTP status codes, including:
- `200 OK`: successful read or update.
- `201 Created`: resource created.
- `204 No Content`: successful operation with no response body.
- `400 Bad Request`: malformed or invalid input.
- `401 Unauthorized`: authentication is missing or invalid.
- `403 Forbidden`: caller is authenticated but lacks permission.
- `404 Not Found`: resource does not exist or should not be disclosed.
- `409 Conflict`: state conflict, duplicate action, or inventory conflict.
- `422 Unprocessable Content`: optionally use for semantically invalid input if this is the project's consistent convention.
- `429 Too Many Requests`: rate limit reached.
- `500 Internal Server Error`: unexpected server failure.

Choose either 400 or 422 consistently for validation errors and document the choice.

## 4. Response structure

Use one consistent response contract. Example success:

```json
{
  "success": true,
  "data": {
    "id": "example-id"
  }
}
```

Example error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields."
  }
}
```

These are illustrative formats. Once implemented, document and reuse the actual response structure. Never include stack traces or secret values in production responses.

## 5. Pagination and filtering

Catalog and admin list endpoints should support bounded pagination. Document:
- Page or cursor convention.
- Maximum page size.
- Sortable fields.
- Allowed filters.
- Search behavior.
- Response metadata.

Never pass arbitrary user-supplied field names directly into MongoDB query operators or sort objects without allowlisting.

## 6. Authentication and ownership

Document which endpoints are public, authenticated, customer-only, or admin-only.

For every resource endpoint, check both:
1. Whether the user has the required role/action permission.
2. Whether the resource belongs to that user when ownership applies.

Do not rely on the frontend to enforce access control.

## 7. External integrations

Payment verification and webhook endpoints need provider-specific signature checks, idempotency, and safe handling of repeated events. AI endpoints need input limits, rate limits, timeouts, and safe provider error handling.

## 8. Implemented conventions (backend)

- **Customer vs admin order views:** customer order endpoints (`POST /orders`, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`) return an allowlisted customer view (`server/src/modules/orders/order.dto.js`). It omits reconciliation/stock-restoration internals, admin user IDs, admin payment/refund notes and the idempotency key, and exposes `paidAt`, `totalRefunded` and `refunds[{ amount, refundedAt }]`. Admin endpoints return the full record.
- **Duplicate records (409):** unique-index conflicts map to `EMAIL_EXISTS`, `PHONE_EXISTS`, `SLUG_EXISTS` or `SKU_EXISTS` for those single-field indexes; any other conflict is a generic `409 CONFLICT` that never names the index or echoes the value (`server/src/utils/duplicateKeyError.js`).
- **Readiness:** `GET /api/v1/health/ready` returns 503 when the database is not connected **or** once shutdown has started (SIGTERM/SIGINT), so load balancers stop routing while in-flight requests drain. Liveness (`/health`) stays 200.
- **Customer cancellation with pending stock reconciliation:** if an order is cancelled but some stock cannot be restored (e.g. a product was removed from the catalog), `POST /orders/:id/cancel` still returns 200 with the customer order view and `data.warning` (a generic "stock updates are still being processed" note). The failure is recorded on the order (`cancellation.stockRestorationStatus` = `PARTIAL`/`FAILED`, `restorationErrors`) and logged; admins find such orders with `GET /admin/orders?restorationStatus=PARTIAL|FAILED|PENDING|COMPLETED` and retry with `POST /admin/orders/:id/reconcile-stock` (idempotent). Admin cancellation keeps its existing 500 behaviour.
- **Public product data:** `GET /products` and `GET /products/:slug` do not return `rating` or `reviewCount` until genuine reviews exist (P9); the stored values are kept.
- **Public product sorting:** allowed `sort` values are `featured` (default), `price-asc`, `price-desc`, `popular`, `newest`, `name`. `rating` is not offered until genuine reviews exist; unknown values fall back to `featured`.
- **Idempotent checkout (`Idempotency-Key`):** the key is bound to a fingerprint of the payment method and the validated delivery address (case and repeated whitespace in text fields are ignored; phone digits, PIN code and wording changes are not). The cart is not part of the fingerprint. Payment method and address are validated before the key is looked up (invalid body → 400, even for a known key). Same key + same details → the original order (200), even after the cart was emptied or stock changed. Same key + different details → `422 IDEMPOTENCY_KEY_REUSED`, with no stock or cart change. Orders created before fingerprints existed replay for any valid details; requests without a key are unaffected.
- **Sessions:** access tokens carry a token version (`tv`). `POST /api/v1/auth/logout` (authenticated) increments the user's version, ending **all** of that user's sessions on every device, and returns 200 `{ message }`. A token whose version no longer matches gets `401 TOKEN_REVOKED`; tokens issued before versioning count as version 0. A disabled account gets `403 ACCOUNT_DISABLED` on any authenticated request and at login (only after a correct password; a wrong password stays the generic `401 INVALID_CREDENTIALS`). Missing, malformed or expired tokens keep their existing 401 codes, which take precedence. `/auth/me` returns only `id`, `name`, `email`, `role`.
- **Login lockout:** `POST /api/v1/auth/login` returns `429 TOO_MANY_ATTEMPTS` with a `Retry-After` header and `error.retryAfterSeconds` once an account key has had 5 attempts in 15 minutes (lock lasts 15 minutes). Responses are identical for existing and unknown emails. The per-IP limiter's `429 RATE_LIMITED` can still occur independently.
- **Idempotent replay and the cart:** each order records the cart version (`cartVersion`, the cart's `__v`) it was built from. Replaying an `Idempotency-Key` clears the cart only if it still has items and is at exactly that version (i.e. a cart left behind by a failed post-checkout clear). A cart the customer changed afterwards is never touched, an empty cart is not written, and orders created before this field existed never clear the cart on replay. Customer cart changes must go through `cart.save()` so the version reflects them.

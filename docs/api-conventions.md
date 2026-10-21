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

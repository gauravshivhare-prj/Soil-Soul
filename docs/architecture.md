# Soil & Soul Architecture

## 1. Architectural approach

Use a **modular monolith** for the backend and a separate Next.js frontend application.

- `client/` owns user interface, client-side interaction, and frontend presentation.
- `server/` owns API endpoints, business rules, authentication, authorization, and database access.
- MongoDB is the planned persistence layer.
- Third-party integrations are isolated behind backend modules.

Do not introduce microservices merely to appear scalable. Split a service only when a demonstrated operational or domain need justifies the added deployment and communication complexity.

## 2. Repository structure

```text
Soil&Soul/
├── client/
│   ├── public/
│   │   └── images/
│   └── src/
│       ├── app/
│       ├── components/
│       │   ├── ui/
│       │   ├── layout/
│       │   ├── store/
│       │   └── admin/
│       ├── features/
│       ├── services/
│       ├── hooks/
│       ├── lib/
│       └── config/
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── routes/
│   │   ├── modules/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── constants/
│   ├── tests/
│   ├── scripts/
│   └── server.js
├── docs/
├── README.md
└── .gitignore
```

The tree describes the intended structure. Empty feature directories are organizational placeholders, not implemented features. Keep the generated framework files that Next.js requires.

## 3. Frontend responsibilities

### `src/app/`
Next.js App Router route files, layouts, global styles, loading states, error states, and not-found UI.

Planned route areas include:
- Storefront: home, shop, product details, category pages.
- Shopping: cart, checkout, order confirmation.
- Customer account: profile, addresses, wishlist, order history.
- Admin: dashboard, products, inventory, orders, coupons, analytics.

### `src/components/`
Reusable visual components. Components should primarily handle rendering and user interaction, not own backend business rules.

- `ui/`: buttons, inputs, dialogs, badges, skeletons.
- `layout/`: navbar, footer, containers.
- `store/`: product cards, product galleries, filters, cart UI.
- `admin/`: admin navigation, tables, charts.

### `src/features/`
Feature-oriented frontend logic, such as state, hooks, and feature-specific UI. Avoid duplicating components or creating a second abstraction for the same behavior.

### `src/services/`
A centralized API client and endpoint-specific request functions. The frontend must not connect directly to MongoDB or contain private API credentials.

### `src/lib/` and `src/config/`
Shared browser-safe utilities and public configuration. Never put private secrets in client-accessible configuration.

## 4. Backend entry points

### `server/server.js`
Process entry point. It should:
1. Load environment configuration.
2. Validate required settings.
3. Start the HTTP listener only after initialization succeeds.
4. Handle graceful shutdown.
5. Avoid logging secret values.

It should not contain route definitions or feature business logic.

### `server/src/app.js`
Creates and configures the Express application:
1. Security and parsing middleware.
2. CORS policy.
3. Request logging, if configured safely.
4. Versioned API router.
5. Not-found handler.
6. Central error handler.

Export the app without listening on a port so tests can import it without opening a network listener.

### `server/src/config/`
Environment validation, database connection setup, and other infrastructure configuration.

### `server/src/routes/`
Root API router and API version mounting. Feature-specific route definitions belong inside their feature modules and are mounted by the root router.

### `server/src/modules/`
Each module owns one domain area. Planned modules:
- `auth/`: registration, login, session/token validation flows.
- `users/`: user profile and account data.
- `products/`: product catalog and product details.
- `categories/`: product taxonomy.
- `cart/`: cart operations.
- `wishlist/`: saved products.
- `addresses/`: delivery addresses.
- `orders/`: order creation, history, permitted status transitions.
- `inventory/`: stock rules and stock adjustments.
- `payments/`: payment-provider abstraction and verification.
- `coupons/`: discount rules and redemption limits.
- `reviews/`: ratings, comments, eligibility, moderation.
- `admin/`: administrative reports and cross-domain dashboard orchestration.
- `assistant/`: mock assistant first, provider integration later.

The `admin` module must not duplicate product or order business rules. Product changes belong to `products/`; stock rules belong to `inventory/`; order lifecycle rules belong to `orders/`. Admin routes call those domain services after authorization.

## 5. Backend module pattern

Use the following files when the module needs them:

```text
products/
├── products.routes.js
├── products.controller.js
├── products.service.js
├── products.model.js
├── products.validation.js
└── products.test.js
```

- Routes: connect HTTP paths to middleware and controllers.
- Controller: translate HTTP input to a service call and translate the result to an HTTP response.
- Service: implement business rules and coordinate persistence.
- Model: define Mongoose schema, validation, and indexes.
- Validation: validate external request data before business logic.
- Tests: verify behavior and failure cases.

Small modules may omit files that add no value. Do not create empty abstraction layers just to match a template.

## 6. Request flow

Typical request:

1. Browser sends an HTTPS request to the Express API.
2. Express middleware applies security headers, parsing, CORS, logging, and rate limits as configured.
3. Authentication middleware identifies the caller for protected routes.
4. Authorization checks whether the caller may perform the requested action on the resource.
5. Validation checks request parameters and body.
6. Controller invokes a domain service.
7. Service applies business rules and uses a model/repository.
8. Controller returns a consistent response.
9. Errors flow to centralized error handling.

Never trust a frontend role, price, discount amount, stock count, or payment status.

## 7. Image handling

During initial development, store static files in `client/public/images/`, organized by `hero/`, `categories/`, `products/`, `brand/`, and `placeholders/`.

When a real catalog needs managed uploads or transformations, consider an image service. Store image URLs or storage identifiers in product records, not binary image files in ordinary MongoDB documents. Do not build image hosting prematurely.

## 8. Scaling path

Start with simple, measurable foundations:
- Stateless API instances.
- Managed database with indexes and backups.
- Pagination for catalog and admin lists.
- External/object storage for uploaded images.
- Structured logs and health checks.
- Rate limits on sensitive endpoints.
- Cache only after measuring a bottleneck.
- Add a queue or separate service only when asynchronous workloads justify it.

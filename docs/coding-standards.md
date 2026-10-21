# JavaScript Coding Standards

## 1. General rules

- Use JavaScript, not TypeScript, unless the project owner explicitly changes this decision.
- Follow the existing module system. The backend uses ES modules.
- Prefer readable, explicit code over clever one-liners.
- Keep functions focused on one responsibility.
- Avoid unnecessary dependencies and premature abstractions.
- Do not silently swallow errors.
- Do not log passwords, tokens, API keys, payment secrets, or sensitive personal data.
- Avoid mutable global state.

## 2. Naming

- Variables and functions: `camelCase`.
- Classes and React components: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for true fixed configuration values.
- Files: follow the established module convention, such as `products.controller.js`.
- Boolean variables should read clearly, such as `isActive`, `hasStock`, or `canCancel`.

Choose names that communicate meaning. Avoid unexplained abbreviations.

## 3. Functions

- Keep functions short enough to understand without scrolling through unrelated behavior.
- Validate external inputs at the boundary.
- Use early returns for invalid conditions where they improve clarity.
- Make asynchronous behavior explicit with `async`/`await`.
- Avoid mixing HTTP response formatting, database queries, and complex business rules in one large controller.
- Return predictable values and throw/forward errors according to the project's established error-handling pattern.

## 4. React and Next.js

- Keep components focused on rendering and interaction.
- Use Server Components by default where appropriate.
- Add `"use client"` only when browser interaction, state, effects, or client-only APIs require it.
- Never expose private credentials through `NEXT_PUBLIC_` environment variables.
- Use the Next.js `Image` component for local and remote images when appropriate.
- Include useful `alt` text and avoid layout shifts by specifying image dimensions or aspect ratios.
- Provide loading, empty, success, and error states for data-driven UI.
- Make interactive controls keyboard accessible.
- Respect `prefers-reduced-motion`.

## 5. Express

- Keep `server.js` as the process entry point and `src/app.js` as the importable Express application.
- Routes define endpoint wiring; controllers handle HTTP concerns; services implement domain behavior.
- Validate request body, parameters, and query values before using them.
- Use a centralized error handler.
- Do not return internal stack traces to production clients.
- Do not trust client-submitted prices, roles, inventory, discounts, or payment status.
- Apply authorization to every protected resource and administrative operation.

## 6. Database

- Use schema validation and indexes intentionally.
- Avoid unbounded queries; paginate catalog and admin endpoints.
- Store order-time snapshots of product names, prices, quantities, discounts, and shipping data.
- Handle concurrent stock changes safely.
- Do not assume checking stock before writing is sufficient under concurrent checkout.
- Avoid storing large binary images directly in product documents.

## 7. Error handling

- Errors should have a consistent structure and appropriate HTTP status.
- Distinguish expected client errors from unexpected server failures.
- Never expose secrets or private internal details in error messages.
- Log enough context to debug safely, using request/correlation IDs where available.

## 8. Dependencies

Before adding a package:
1. Explain the need.
2. Check whether existing dependencies can solve it.
3. Confirm compatibility with the current Node/Next versions.
4. Install only the required package.
5. Run lint, tests, and build checks.

Do not upgrade all dependencies merely to fix one unrelated issue.

# Testing Strategy

## 1. Testing layers

### Unit tests
Test isolated pure functions and domain rules, such as price calculations, coupon rules, and allowed order transitions.

### Integration tests
Test Express endpoints with middleware and persistence behavior. Use a controlled test database or isolated test data. Never point tests at production data.

### End-to-end tests
Test critical user journeys in a browser once the UI and backend workflows exist.

### Manual checks
Use manual checks for responsive layout, accessibility, visual quality, and integration behavior that automated tests do not cover fully.

## 2. Minimum checks after changes

Frontend changes:
- Run `npm run lint` from `client/`.
- Run `npm run build` from `client/`.
- Verify affected pages at mobile and desktop widths.
- Test keyboard focus and reduced-motion behavior for interactive UI.

Backend changes:
- Run the configured backend test command.
- Start the server and verify the health endpoint.
- Test success, invalid input, unauthenticated access, forbidden access, and missing-resource cases as relevant.

Full-stack changes:
- Test the entire affected flow, not just an isolated component.
- Confirm browser requests and API responses match the documented contract.

## 3. Critical future e-commerce journeys

1. Guest can browse and search products.
2. Customer can register, log in, and log out.
3. Customer can update cart quantities and receive correct totals.
4. Server rejects invalid quantities and client-tampered prices.
5. COD checkout creates a correct order.
6. Customer cannot view another customer's order.
7. Admin-only APIs reject non-admin users.
8. Concurrent checkouts cannot oversell stock.
9. Coupon limits and expiry are enforced server-side.
10. Razorpay verification and repeated webhook events are handled safely.
11. Mock assistant works without an external API key.
12. Live assistant cannot access unauthorized order data.

## 4. Test data

Use synthetic products and users. Never put real customer information or production secrets into fixtures, screenshots, or test logs.

## 5. Reporting

For each phase, report:
- Exact command.
- Pass/fail.
- Relevant output or summary.
- Tests not run and why.
- Known limitations.

Do not claim a test passed based only on code inspection.

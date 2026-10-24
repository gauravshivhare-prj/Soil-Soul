# Architecture Decision Records

This document records current decisions and the reasons behind them. Revisit a decision only when a real requirement changes.

## ADR-001: Separate client and server applications

**Decision:** Use `client/` for Next.js and `server/` for Express.

**Reason:** Keeps UI and backend responsibilities separate and allows independent development and deployment.

**Trade-off:** Requires CORS and API base URL configuration.

## ADR-002: Modular monolith backend

**Decision:** Use one Express application divided into domain modules.

**Reason:** Easier to build, debug, test, and deploy than multiple services for an initial internship project.

**Trade-off:** Modules must maintain clear boundaries to avoid tight coupling.

## ADR-003: Backend startup file outside `src/`

**Decision:** Place `server.js` at `server/server.js` and the Express app in `server/src/app.js`.

**Reason:** Separates process startup/listening from app configuration and makes the Express app easier to import in tests.

## ADR-004: Local images first

**Decision:** Keep initial static imagery under `client/public/images/`.

**Reason:** Avoids introducing image-service setup before the storefront needs it.

**Future option:** Use an image CDN/storage service when uploads, transformations, or delivery needs justify it.

## ADR-005: COD before online payments

**Decision:** Implement and verify the COD order flow before Razorpay test mode.

**Reason:** The core order and inventory behavior should be reliable independently of a payment gateway.

## ADR-006: AI integration last

**Decision:** Build a mock assistant UI first and integrate OpenAI only after core workflows and security checks.

**Reason:** Reduces external dependencies during early development and minimizes credential exposure risk.

## ADR-007: Document intent, not every trivial line

**Decision:** Document function contracts, module responsibilities, side effects, security assumptions, and complex business rules. Avoid comments that merely restate syntax.

**Reason:** Meaningful comments improve maintainability; line-by-line narration often becomes noisy and stale.

## ADR-008: Two-decimal rupee amounts for COD v1

**Decision:** Monetary values (prices, totals, refunds) stay as rupee numbers rounded to two decimals (`Math.round(x * 100) / 100`) for the Cash-on-Delivery release. The order model is not converted to integer paise.

**Reason:** All order, cart and refund logic and its tests already use this representation consistently; converting now would touch every money path without a functional need for COD.

**Implications:** Every calculation must round to two decimals at each step; refunds below Rs. 0.01 are rejected. Revisit (integer paise at API boundaries) before integrating an online payment provider.

## ADR-009: Single server instance for the initial release

**Decision:** The first release runs one backend instance. Rate limiting (`express-rate-limit`) uses its in-memory store and the checkout lock is process-local.

**Limitation:** Limits and the lock are per process and reset on restart. This is **not** suitable for multiple instances; scaling out requires a shared rate-limit store. Order/stock correctness does not depend on the lock (unique indexes and atomic conditional stock updates enforce it).

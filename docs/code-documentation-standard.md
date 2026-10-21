# Code Documentation Standard

The objective is that another developer can understand the code's purpose, contracts, assumptions, and failure behavior without guessing.

## 1. Do not comment every obvious line

Comments such as `// increase i by one` beside `i++` add noise. Prefer clear code and meaningful names. Add comments to explain intent, constraints, non-obvious algorithms, security decisions, and important trade-offs.

Every meaningful function must still be documented where a reader would otherwise have to infer its contract.

## 2. Function documentation

For exported functions, service functions, security-sensitive functions, and non-trivial helpers, use JSDoc in this style:

```js
/**
 * Calculates the subtotal for a list of validated cart items.
 *
 * Each item must have a non-negative integer quantity and a trusted
 * server-side unit price. The browser must never supply the authoritative
 * price used for checkout.
 *
 * @param {Array<{ quantity: number, unitPrice: number }>} items
 *   Cart items already validated by the caller.
 * @returns {number} Subtotal in the application's chosen currency unit.
 * @throws {TypeError} If the input is not an array.
 */
export function calculateSubtotal(items) {
  if (!Array.isArray(items)) {
    throw new TypeError("Cart items must be an array.");
  }

  return items.reduce((subtotal, item) => {
    return subtotal + item.quantity * item.unitPrice;
  }, 0);
}
```

This example is illustrative; it is not a request to add cart functionality in the current setup phase. A real implementation must also define currency precision and validate every item according to the project's chosen contract.

## 3. What function documentation should cover

Where relevant, document:
- Purpose and business reason.
- Parameters and accepted shapes.
- Return value and units.
- Errors or rejected conditions.
- Side effects, including database writes or external requests.
- Authorization assumptions.
- Important invariants or concurrency assumptions.

Do not document obvious implementation details that can be read directly from the code.

## 4. File-level responsibility

At the top of a file, add a short comment only when the module's responsibility is not obvious from its name or location. Explain what it owns and what it must not own.

Example:

```js
/**
 * HTTP controller for product endpoints.
 *
 * This module translates Express request data into service calls and HTTP
 * responses. Product business rules belong in products.service.js.
 */
```

## 5. Complex logic comments

Explain why the code is written a particular way, especially for:
- Authorization checks.
- Inventory consistency.
- Coupon limits.
- Payment signature verification.
- Idempotent webhook processing.
- State transitions.
- Data migrations.
- Performance-sensitive algorithms.

Comments must be updated when behavior changes.

## 6. API documentation

For each endpoint, document:
- HTTP method and path.
- Authentication and required role.
- Path/query/body parameters.
- Success response and status code.
- Expected error responses.
- Validation constraints.
- Side effects.
- Rate limits or idempotency requirements where relevant.

## 7. Keep documentation synchronized

Update code comments, API docs, architecture docs, tests, and environment examples in the same change when a contract or important behavior changes.

Do not claim that code is tested unless the corresponding test was run. Do not write comments that promise behavior the implementation does not provide.

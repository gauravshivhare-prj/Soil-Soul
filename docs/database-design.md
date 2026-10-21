# Database Design Guidelines

MongoDB/Mongoose integration is planned for a later phase. This document records design rules, not a claim that these models already exist.

## 1. Planned collections

### User
Possible fields: name, normalized unique email, password hash, role, phone where required, timestamps, account status.

Never store plaintext passwords. Avoid collecting personal information that is not needed.

### Product
Possible fields: name, unique slug, description, category reference, image references, price, compare-at price if used, stock/availability, product-family attributes, active status, timestamps.

The product model must support three families:
- Live plants: plant type, light needs, watering guidance, pet-safety notes where verified.
- Gardening supplies: material, dimensions, weight/volume, intended use.
- Plant-based care: ingredient list, net quantity, usage information, manufacturer/expiry data when available.

Use validated optional attributes or a well-defined category-specific structure. Do not force skincare-only fields onto plants.

### Category
Name, unique slug, description, image reference, active status, display order.

### Cart
Customer reference and item references/quantities. Decide whether guest carts are supported before implementation.

### Wishlist
Customer reference and product references, with uniqueness rules to prevent duplicate entries.

### Address
Customer reference, recipient, phone, address lines, city, state, postal code, and default indicator. Minimize exposure of address data.

### Order
Customer reference, immutable item snapshots, delivery-address snapshot, subtotal, discount, shipping, final total, payment method/status, order status, timestamps.

Snapshot product name and price at purchase time so later catalog edits do not rewrite historical orders.

### Payment
Order reference, provider, provider order/payment IDs, amount, currency, state, verification timestamps, and safe provider metadata. Do not store card numbers or sensitive authentication data.

### Coupon
Normalized unique code, discount type/value, minimum order, maximum discount, start/expiry, active state, usage limits, per-customer limits.

### Review
Customer reference, product reference, eligible order reference, rating, comment, moderation state, timestamps. Enforce the chosen review-eligibility policy.

## 2. Relationships and indexes

Plan indexes for:
- Unique normalized user email.
- Unique product slug.
- Category lookup.
- Active product listing and common filters.
- Orders by customer and creation time.
- Unique provider identifiers where appropriate.
- Coupon code lookup.
- Review lookup by product.

Indexes should be based on actual query patterns and verified with explain plans when performance matters.

## 3. Money and quantities

Choose one currency and a consistent representation. For INR, integer paise is a practical representation for monetary values; document conversion at API boundaries. Never use unrounded floating-point arithmetic as the authority for payment totals.

Validate quantities as positive integers and enforce stock limits server-side.

## 4. Inventory consistency

A simple "read stock, then subtract" flow can oversell under concurrent requests. Use a concurrency-safe conditional update or transaction strategy. Define when stock is decremented or reserved and how cancellation/payment failure releases it.

Do not promise database transaction guarantees without verifying the selected MongoDB deployment supports the required transaction mode.

## 5. Order state

Define permitted transitions explicitly. Example lifecycle: placed, confirmed, processing, shipped, delivered, cancelled. Restrict transitions by role and current state.

Payment status is separate from order status. COD delivery does not mean the system may blindly mark the order paid. Payment updates must follow the defined COD collection process.

## 6. Data lifecycle

Document retention and deletion behavior for accounts, orders, reviews, and audit records. Avoid hard-deleting records required for financial/order history. Apply access controls to administrative reports.

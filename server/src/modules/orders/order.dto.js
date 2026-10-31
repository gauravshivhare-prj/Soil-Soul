/**
 * Customer-facing order representation.
 *
 * An explicit allowlist: only fields a customer may see are copied, so internal data
 * added to the Order model later is hidden by default. Never exposed to customers:
 * reconciliation lease/fencing state, stock-restoration flags and errors, admin user
 * IDs (cancelledBy, collectedBy, refundedBy), admin payment/refund notes and the
 * idempotency key. Admin routes keep returning the full document.
 */

// Mongoose adds an `_id` getter to ObjectIds, so this also works for populated refs.
const idOf = (value) => (value == null ? null : String(value._id ?? value));

function toCustomerItem(item) {
  return {
    product: idOf(item.product),
    name: item.name,
    slug: item.slug ?? null,
    image: item.image ?? null,
    option: item.option?.id
      ? {
          id: item.option.id,
          name: item.option.name ?? null,
          detail: item.option.detail ?? null,
          priceDelta: item.option.priceDelta ?? 0,
        }
      : null,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  };
}

function toCustomerAddress(address) {
  if (!address) return null;
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

/**
 * @param {import('mongoose').Document|Object} order - Order document or plain object
 * @returns {Object} Customer-safe order
 */
export function toCustomerOrder(order) {
  const o = typeof order?.toObject === 'function' ? order.toObject() : order;

  return {
    id: idOf(o._id ?? o.id),
    orderNumber: o.orderNumber,
    user: idOf(o.user),
    items: (o.items ?? []).map(toCustomerItem),
    deliveryAddress: toCustomerAddress(o.deliveryAddress),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee ?? 0,
    discount: o.discount ?? 0,
    coupon: o.coupon ? { code: o.coupon.code, discountType: o.coupon.discountType, discount: o.coupon.discount } : null,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    statusHistory: (o.statusHistory ?? []).map((entry) => ({
      previousStatus: entry.previousStatus ?? null,
      nextStatus: entry.nextStatus,
      changedAt: entry.changedAt,
      actorRole: entry.actorRole,
      reason: entry.actorRole === 'customer' ? entry.reason ?? null : null,
    })),
    cancellation: o.cancellation
      ? {
          reason: o.cancellation.reason ?? null,
          cancelledAt: o.cancellation.cancelledAt ?? null,
          actorRole: o.cancellation.actorRole ?? null,
        }
      : null,
    paidAt: o.paymentDetails?.collectedAt ?? null,
    totalRefunded: o.totalRefunded ?? 0,
    refunds: (o.refunds ?? []).map((r) => ({ amount: r.amount, refundedAt: r.refundedAt ?? null })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

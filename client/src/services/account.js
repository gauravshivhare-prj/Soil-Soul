/**
 * Account service — demo customer profile, addresses, payment methods and
 * order history. Mock data now; replace with authenticated API calls later.
 */

import { DEMO_ADDRESSES, DEMO_ORDERS, DEMO_PAYMENT_METHODS, DEMO_USER, DEMO_WISHLIST } from "@/data/commerce";
import { getProduct } from "@/services/catalog";

/* Order with product details, item count and totals attached. */
export function enrichOrder(order) {
  const items = order.items.map((item) => ({ ...item, product: getProduct(item.slug) }));
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = order.shipping ?? 0;
  return {
    ...order,
    items,
    itemCount: items.reduce((n, i) => n + i.qty, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
}

export function getUser() {
  return DEMO_USER;
}

export function getAddresses() {
  return DEMO_ADDRESSES;
}

export function getPaymentMethods() {
  return DEMO_PAYMENT_METHODS;
}

export function getOrders() {
  return DEMO_ORDERS.map(enrichOrder);
}

export function getOrder(id) {
  const order = DEMO_ORDERS.find((o) => o.id === id);
  return order ? enrichOrder(order) : null;
}

export function getDemoWishlist() {
  return DEMO_WISHLIST;
}

/**
 * Admin service — dashboard metrics, orders, customers, inventory and
 * reviews. Mock data now; the real admin API must enforce authentication
 * and authorization on every request.
 */

import {
  ADMIN_CUSTOMERS,
  ADMIN_ORDERS,
  ADMIN_PROFILE,
  ADMIN_REVIEWS,
  ADMIN_SETTINGS,
  DASHBOARD_METRICS,
  DASHBOARD_RANGE,
  ORDER_STATUS_COUNTS,
  SALES_LAST_30_DAYS,
  SALES_LAST_7_DAYS,
} from "@/data/admin";
import { COUPONS } from "@/data/commerce";
import { getCategories, getProduct, getProducts } from "@/services/catalog";
import { enrichOrder } from "@/services/account";

const CUSTOMER_BY_ID = new Map(ADMIN_CUSTOMERS.map((c) => [c.id, c]));

export function getAdminProfile() {
  return ADMIN_PROFILE;
}

export function getAdminSettings() {
  return ADMIN_SETTINGS;
}

export function getCustomer(id) {
  return CUSTOMER_BY_ID.get(id) ?? null;
}

export function getCustomers() {
  return ADMIN_CUSTOMERS;
}

export function getAdminOrders() {
  return ADMIN_ORDERS.map((o) => ({ ...enrichOrder({ ...o, shipping: 0 }), customer: getCustomer(o.customerId) }));
}

export function getAdminOrder(id) {
  return getAdminOrders().find((o) => o.id === id) ?? null;
}

export function getLowStockProducts(threshold = ADMIN_SETTINGS.lowStockThreshold) {
  return getProducts()
    .filter((p) => p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock);
}

/* Product count per category, largest first. */
export function getCategoryBreakdown() {
  return getCategories()
    .map((c) => ({ slug: c.slug, name: c.shortName, count: c.productCount }))
    .sort((a, b) => b.count - a.count);
}

export function getDashboard() {
  const productCount = getProducts().length;
  return {
    range: DASHBOARD_RANGE,
    metrics: { ...DASHBOARD_METRICS, products: { ...DASHBOARD_METRICS.products, value: productCount } },
    sales: SALES_LAST_7_DAYS,
    orderStatus: ORDER_STATUS_COUNTS,
    categories: getCategoryBreakdown(),
    productCount,
  };
}

export function getSalesLast30Days() {
  return SALES_LAST_30_DAYS;
}

export function getAdminReviews() {
  return ADMIN_REVIEWS.map((r) => ({ ...r, product: getProduct(r.slug), customer: getCustomer(r.customerId) }));
}

export function getAdminCoupons() {
  return COUPONS.map((c, i) => ({ ...c, id: c.code, uses: [42, 18, 65][i] ?? 0, active: true }));
}

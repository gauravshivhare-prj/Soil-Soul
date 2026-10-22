/**
 * Admin dashboard mock data — demo values only.
 *
 * Customers use placeholder names and example.com emails. Product stock,
 * category counts and catalog details come from data/catalog.js via
 * services/admin.js so the admin views stay consistent with the shop.
 */

export const ADMIN_PROFILE = { name: "Admin", role: "Store Manager" };

export const DASHBOARD_RANGE = "Oct 12, 2026 – Oct 18, 2026";

/* Headline metrics for the selected week, with change vs the previous week. */
export const DASHBOARD_METRICS = {
  orders: { value: 128, change: 12, note: "+14 from last week" },
  sales: { value: 42580, change: 18, note: "+₹6,480 from last week" },
  customers: { value: 96, change: 8, note: "+7 from last week" },
  products: { value: null, change: 4, note: "+2 new this week" }, // value = catalog size
};

/* Daily sales (₹) for the last 7 days. */
export const SALES_LAST_7_DAYS = [
  { day: "12 Oct", sales: 4200 },
  { day: "13 Oct", sales: 6100 },
  { day: "14 Oct", sales: 8600 },
  { day: "15 Oct", sales: 9300 },
  { day: "16 Oct", sales: 8500 },
  { day: "17 Oct", sales: 8600 },
  { day: "18 Oct", sales: 13800 },
];

/* Daily sales (₹) for the last 30 days — analytics page. */
export const SALES_LAST_30_DAYS = [
  3100, 2800, 4200, 3900, 5100, 4700, 6200, 3600, 4100, 5300, 4900, 6100, 7200, 5600, 4800,
  5200, 6600, 7100, 6400, 5900, 7800, 8100, 4200, 6100, 8600, 9300, 8500, 8600, 9900, 13800,
];

export const ORDER_STATUS_COUNTS = { delivered: 68, shipped: 32, processing: 18, cancelled: 10 };

export const ADMIN_CUSTOMERS = [
  { id: "c-101", name: "Customer A. Mehta", email: "customer.a@example.com", city: "Bhopal", orders: 6, spent: 4820, joined: "2025-03-14", status: "active" },
  { id: "c-102", name: "Customer B. Sharma", email: "customer.b@example.com", city: "Indore", orders: 3, spent: 1647, joined: "2025-06-02", status: "active" },
  { id: "c-103", name: "Customer C. Verma", email: "customer.c@example.com", city: "Pune", orders: 2, spent: 1097, joined: "2025-08-21", status: "active" },
  { id: "c-104", name: "Customer D. Gupta", email: "customer.d@example.com", city: "Delhi", orders: 9, spent: 7340, joined: "2024-12-09", status: "active" },
  { id: "c-105", name: "Customer E. Singh", email: "customer.e@example.com", city: "Jaipur", orders: 1, spent: 1549, joined: "2026-10-01", status: "active" },
  { id: "c-106", name: "Customer F. Rao", email: "customer.f@example.com", city: "Hyderabad", orders: 4, spent: 2380, joined: "2025-11-17", status: "blocked" },
  { id: "c-107", name: "Customer G. Nair", email: "customer.g@example.com", city: "Kochi", orders: 5, spent: 3125, joined: "2025-01-28", status: "active" },
  { id: "c-108", name: "Customer H. Das", email: "customer.h@example.com", city: "Kolkata", orders: 2, spent: 898, joined: "2026-07-11", status: "active" },
];

/* Store-wide recent orders. Items reference catalog slugs. */
export const ADMIN_ORDERS = [
  { id: "SS1024", customerId: "c-101", date: "2026-10-18", status: "delivered", payment: "UPI", items: [{ slug: "monstera-deliciosa", qty: 1, price: 699 }, { slug: "terracotta-plant-pot", qty: 2, price: 249 }] },
  { id: "SS1023", customerId: "c-102", date: "2026-10-18", status: "shipped", payment: "Razorpay", items: [{ slug: "organic-potting-soil-5kg", qty: 1, price: 349 }] },
  { id: "SS1022", customerId: "c-103", date: "2026-10-17", status: "processing", payment: "Cash on Delivery", items: [{ slug: "peace-lily", qty: 1, price: 399 }, { slug: "organic-potting-soil-5kg", qty: 1, price: 349 }] },
  { id: "SS1021", customerId: "c-104", date: "2026-10-17", status: "delivered", payment: "UPI", items: [{ slug: "aloe-vera-gel", qty: 1, price: 399 }] },
  { id: "SS1020", customerId: "c-105", date: "2026-10-16", status: "cancelled", payment: "Razorpay", items: [{ slug: "snake-plant", qty: 2, price: 499 }, { slug: "gardening-tool-set", qty: 1, price: 299 }, { slug: "vermicompost-2kg", qty: 1, price: 199 }] },
  { id: "SS1019", customerId: "c-107", date: "2026-10-16", status: "delivered", payment: "UPI", items: [{ slug: "herbal-shampoo", qty: 1, price: 349 }, { slug: "neem-face-wash", qty: 1, price: 249 }] },
  { id: "SS1017", customerId: "c-108", date: "2026-10-15", status: "shipped", payment: "Cash on Delivery", items: [{ slug: "zz-plant", qty: 1, price: 449 }, { slug: "herbal-soap-bar", qty: 2, price: 129 }] },
  { id: "SS1016", customerId: "c-106", date: "2026-10-14", status: "processing", payment: "UPI", items: [{ slug: "areca-palm", qty: 1, price: 599 }] },
];

export const ADMIN_REVIEWS = [
  { id: "rv-1", slug: "monstera-deliciosa", customerId: "c-101", rating: 5, text: "Healthy plant, lovely packaging.", date: "2026-10-16", status: "approved" },
  { id: "rv-2", slug: "aloe-vera-gel", customerId: "c-104", rating: 4, text: "Soothing and non-sticky.", date: "2026-10-15", status: "pending" },
  { id: "rv-3", slug: "terracotta-plant-pot", customerId: "c-102", rating: 3, text: "Good pot, saucer was slightly chipped.", date: "2026-10-14", status: "pending" },
  { id: "rv-4", slug: "herbal-shampoo", customerId: "c-107", rating: 5, text: "Hair feels soft. Great smell.", date: "2026-10-12", status: "approved" },
  { id: "rv-5", slug: "snake-plant", customerId: "c-105", rating: 2, text: "Arrived with a bent leaf.", date: "2026-10-10", status: "hidden" },
];

export const ADMIN_SETTINGS = {
  storeName: "Soil & Soul",
  supportEmail: "hello@soilandsoul.in",
  supportPhone: "+91 98765 43210",
  freeShippingThreshold: 499,
  shippingFee: 49,
  lowStockThreshold: 6,
};

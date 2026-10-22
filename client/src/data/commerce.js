/**
 * Cart, checkout and account mock data.
 *
 * Demo values only — the backend will own coupons, shipping rules, saved
 * addresses, payment methods and orders. Never trust these client-side
 * values for real pricing or payment decisions.
 */

/* Free shipping above this subtotal (matches the announcement bar). */
export const FREE_SHIPPING_THRESHOLD = 499;
export const SHIPPING_FEE = 49;

/* Demo coupons. `type`: "percent" | "flat" | "shipping". */
export const COUPONS = [
  { code: "GREEN10", type: "percent", value: 10, minSubtotal: 499, description: "10% off orders above ₹499" },
  { code: "WELCOME50", type: "flat", value: 50, minSubtotal: 299, description: "₹50 off your first order" },
  { code: "FREESHIP", type: "shipping", value: 0, minSubtotal: 0, description: "Free shipping on any order" },
];

/* Payment options shown at checkout (UI only — no gateway connected). */
export const PAYMENT_OPTIONS = [
  { id: "cod", name: "Cash on Delivery (COD)", detail: "Pay at your doorstep", icon: "cash" },
  { id: "razorpay", name: "Razorpay (Cards, UPI, NetBanking)", detail: "Pay securely with Razorpay", icon: "card" },
  { id: "upi", name: "UPI", detail: "Google Pay, PhonePe, Paytm, etc.", icon: "upi" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

/* ─── Demo customer account ─────────────────────────────────────── */
/* Placeholder identity — clearly a demo, not a real person. */
export const DEMO_USER = {
  id: "u-demo",
  name: "Demo Customer",
  email: "demo.customer@example.com",
  phone: "+91 90000 00000",
  memberSince: "2024-11-12",
};

export const DEMO_ADDRESSES = [
  {
    id: "addr-home",
    label: "Home",
    name: "Demo Customer",
    line1: "12 Green Park",
    line2: "Near City Garden",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462016",
    phone: "+91 90000 00000",
    isDefault: true,
  },
  {
    id: "addr-work",
    label: "Work",
    name: "Demo Customer",
    line1: "4th Floor, Example Towers",
    line2: "MP Nagar Zone 1",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462011",
    phone: "+91 90000 00000",
    isDefault: false,
  },
];

export const DEMO_PAYMENT_METHODS = [
  { id: "pm-upi", type: "upi", name: "UPI", detail: "demo@upi", isDefault: true },
  { id: "pm-razorpay", type: "razorpay", name: "Razorpay", detail: "Added on 12 Sep 2026", isDefault: false },
];

/* Order statuses shared by account and admin views. */
export const ORDER_STATUSES = ["processing", "shipped", "delivered", "cancelled"];

/* Demo customer's order history. Items reference catalog slugs. */
export const DEMO_ORDERS = [
  {
    id: "SS1024", date: "2026-10-12", status: "delivered", payment: "UPI", addressId: "addr-home",
    items: [{ slug: "monstera-deliciosa", qty: 1, price: 699 }, { slug: "organic-potting-soil-5kg", qty: 1, price: 349 }],
    shipping: 0,
  },
  {
    id: "SS1018", date: "2026-10-05", status: "shipped", payment: "Cash on Delivery", addressId: "addr-home",
    items: [{ slug: "terracotta-plant-pot", qty: 1, price: 249 }],
    shipping: 49,
  },
  {
    id: "SS1003", date: "2026-09-28", status: "delivered", payment: "Razorpay", addressId: "addr-work",
    items: [{ slug: "organic-potting-soil-5kg", qty: 1, price: 349 }],
    shipping: 49,
  },
  {
    id: "SS0987", date: "2026-09-12", status: "cancelled", payment: "UPI", addressId: "addr-home",
    items: [{ slug: "aloe-vera-gel", qty: 3, price: 399 }],
    shipping: 0,
  },
];

/* Wishlist seeded for the demo account (used until the user adds their own). */
export const DEMO_WISHLIST = ["snake-plant", "peace-lily", "ceramic-planter-white", "basil-seeds", "neem-face-wash", "herbal-shampoo"];

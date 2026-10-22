/**
 * Cart pricing helpers — display estimates only.
 *
 * The backend must recalculate prices, discounts, shipping and taxes
 * before any real order is created. Prices are inclusive of taxes.
 */

import { COUPONS, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/data/commerce";

/* Returns { ok: true, coupon } or { ok: false, error }. */
export function validateCoupon(code, subtotal) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a coupon code." };
  const coupon = COUPONS.find((c) => c.code === normalized);
  if (!coupon) return { ok: false, error: "This coupon code isn't valid." };
  if (subtotal < coupon.minSubtotal) {
    return { ok: false, error: `Add items worth ₹${coupon.minSubtotal - subtotal} more to use ${coupon.code}.` };
  }
  return { ok: true, coupon };
}

/**
 * lines: [{ unitPrice, qty }]; coupon: coupon object or null.
 * Returns { itemCount, subtotal, discount, shipping, total, freeShippingRemaining, couponValid }.
 */
export function calculateTotals(lines, coupon) {
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

  // A previously applied coupon stops counting if the cart drops below its minimum.
  const couponValid = Boolean(coupon) && subtotal >= coupon.minSubtotal;
  let discount = 0;
  if (couponValid && coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
  if (couponValid && coupon.type === "flat") discount = Math.min(coupon.value, subtotal);

  const afterDiscount = subtotal - discount;
  const freeShipping = (couponValid && coupon.type === "shipping") || afterDiscount >= FREE_SHIPPING_THRESHOLD;
  const shipping = subtotal === 0 || freeShipping ? 0 : SHIPPING_FEE;

  return {
    itemCount,
    subtotal,
    discount,
    shipping,
    total: afterDiscount + shipping,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount),
    couponValid,
  };
}

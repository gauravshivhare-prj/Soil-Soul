/**
 * Display formatting helpers shared across storefront components.
 */

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/* Whole-rupee price, Indian digit grouping: 1299 → "₹1,299". */
export function formatPrice(amount) {
  return `₹${rupees.format(amount)}`;
}

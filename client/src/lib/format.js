/**
 * Display formatting helpers shared across storefront components.
 */

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/* Whole-rupee price, Indian digit grouping: 1299 → "₹1,299". */
export function formatPrice(amount) {
  return `₹${rupees.format(amount)}`;
}

/* Plain number with Indian grouping: 42580 → "42,580". */
export function formatNumber(value) {
  return rupees.format(value);
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthYearFormat = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

/* ISO date → "12 Oct 2026". UTC keeps server and browser output identical. */
export function formatDate(iso) {
  return dateFormat.format(new Date(iso));
}

/* ISO date → "Nov 2024". */
export function formatMonthYear(iso) {
  return monthYearFormat.format(new Date(iso));
}

/* "Count item(s)" with correct plural. */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/* One-line address text, e.g. for cards and summaries. */
export function formatAddress(a) {
  return [a.line1, a.line2, a.city, `${a.state} ${a.pincode}`].filter(Boolean).join(", ");
}

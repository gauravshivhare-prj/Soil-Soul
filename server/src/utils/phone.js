/**
 * Normalize an Indian mobile number to E.164 (`+91` followed by 10 digits starting 6–9).
 * Accepts spaces, hyphens, dots and parentheses, and an optional `+91`, `91` or `0` prefix.
 * Matches the frontend rule in client/src/lib/validation.js.
 *
 * @param {unknown} value
 * @returns {string|null} `+91XXXXXXXXXX`, or null if the value is not a valid Indian mobile number
 */
export function normalizeIndianMobile(value) {
  if (typeof value !== 'string') return null;
  const compact = value.trim().replace(/[\s\-.()]/g, '');
  if (compact.length > 16) return null;
  const digits = compact.replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

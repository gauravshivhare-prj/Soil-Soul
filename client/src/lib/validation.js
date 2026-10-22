/**
 * Client-side form validation for better UX only.
 * The backend must validate every field again — never rely on these.
 *
 * Each validator returns an error message string, or "" when valid.
 */

export const required = (label) => (value) => (String(value ?? "").trim() ? "" : `${label} is required.`);

export function email(value) {
  if (!value.trim()) return "Email address is required.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? "" : "Enter a valid email address.";
}

/* Indian mobile number: optional +91 / 0 prefix, then 10 digits starting 6–9. */
export function phone(value) {
  const digits = value.replace(/[\s-]/g, "").replace(/^(\+91|0)/, "");
  if (!digits) return "Mobile number is required.";
  return /^[6-9]\d{9}$/.test(digits) ? "" : "Enter a valid 10-digit mobile number.";
}

export function pincode(value) {
  if (!value.trim()) return "PIN code is required.";
  return /^[1-9]\d{5}$/.test(value.trim()) ? "" : "Enter a valid 6-digit PIN code.";
}

export function password(value) {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number.";
  return "";
}

/**
 * Validate `values` against `rules` ({ field: validator | [validators] }).
 * Returns { errors, isValid } where errors only contains failing fields.
 */
export function validate(values, rules) {
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    for (const check of [].concat(rule)) {
      const message = check(values[field] ?? "", values);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

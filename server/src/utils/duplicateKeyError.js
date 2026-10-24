import { createError } from './createError.js';

// Unique fields whose conflicts are safe and useful to name to the client.
const KNOWN_DUPLICATES = Object.freeze({
  email: ['EMAIL_EXISTS', 'An account with this email address already exists.'],
  phone: ['PHONE_EXISTS', 'This phone number cannot be used. Please use a different number.'],
  slug: ['SLUG_EXISTS', 'This slug is already in use.'],
  sku: ['SKU_EXISTS', 'This SKU is already in use.'],
});

/**
 * Field names of the unique index a MongoDB duplicate-key (E11000) error refers to.
 * Uses `keyPattern`/`keyValue` (field names only; the duplicated values are never read).
 */
function duplicateFields(err) {
  return Object.keys(err?.keyPattern ?? err?.keyValue ?? {});
}

/**
 * Convert a duplicate-key error into a safe 409. Single-field indexes listed above get their
 * own code; everything else (compound indexes, order numbers, unknown indexes) becomes a
 * generic CONFLICT that never names the index or echoes the duplicated value.
 *
 * @param {Error} err - MongoDB error with code 11000
 * @returns {Error} 409 operational error
 */
export function toDuplicateKeyError(err) {
  const fields = duplicateFields(err);
  const known = fields.length === 1 ? KNOWN_DUPLICATES[fields[0]] : null;
  if (known) return createError(409, known[0], known[1]);
  return createError(409, 'CONFLICT', 'The request conflicts with an existing record.');
}

export function isDuplicateKeyError(err) {
  return err?.code === 11000;
}

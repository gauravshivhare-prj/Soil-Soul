import mongoose from 'mongoose';
import { createError } from './createError.js';

/**
 * Small hand-written validators for admin write endpoints. Each throws a 400 VALIDATION_ERROR
 * with a field-specific message; none echo the rejected value.
 */

const invalid = (message) => createError(400, 'VALIDATION_ERROR', message);

/** The body must be a plain object containing only allowed keys. */
export function requireBody(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid('A JSON object body is required.');
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw invalid(`Unknown or read-only field(s): ${unknown.slice(0, 5).join(', ')}.`);
  return body;
}

export function objectId(value, label = 'id') {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value) || !/^[a-f0-9]{24}$/i.test(value)) {
    throw invalid(`A valid ${label} is required.`);
  }
  return value;
}

export function text(value, label, { min = 0, max, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required || min > 0) throw invalid(`${label} is required.`);
    return '';
  }
  if (typeof value !== 'string') throw invalid(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length < min || (max !== undefined && trimmed.length > max)) {
    throw invalid(`${label} must be between ${min} and ${max} characters.`);
  }
  return trimmed;
}

export function integer(value, label, { min, max }) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw invalid(`${label} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

/** Money in rupees with at most two decimals (ADR-008). */
export function money(value, label, { min = 0, max = 10_000_000 } = {}) {
  const cents = value * 100;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || Math.abs(Math.round(cents) - cents) > 1e-6) {
    throw invalid(`${label} must be an amount between ${min} and ${max} with at most two decimals.`);
  }
  return value;
}

export function boolean(value, label) {
  if (typeof value !== 'boolean') throw invalid(`${label} must be true or false.`);
  return value;
}

export function oneOf(value, label, allowed) {
  if (!allowed.includes(value)) throw invalid(`${label} must be one of: ${allowed.map(String).join(', ')}.`);
  return value;
}

export function list(value, label, { max, item }) {
  if (!Array.isArray(value)) throw invalid(`${label} must be a list.`);
  if (value.length > max) throw invalid(`${label} can have at most ${max} entries.`);
  return value.map((entry, index) => item(entry, `${label} #${index + 1}`));
}

/** lowercase-alphanumeric-with-hyphens, derived from a name when not supplied. */
export function slug(value, label = 'Slug', { max = 80 } = {}) {
  const raw = String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!raw || raw.length > max || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) {
    throw invalid(`${label} must contain letters or digits and be at most ${max} characters.`);
  }
  return raw;
}

/**
 * Image sources: absolute https URLs or site-relative paths under /images/ (no uploads in v1).
 * Rejects javascript:, data:, http:, protocol-relative and path-traversal sources.
 */
export function imageSrc(value, label = 'Image') {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw invalid(`${label} source is required (max 500 characters).`);
  const src = value.trim();
  if (src.startsWith('/images/')) {
    if (/\.\.|\/\/|\\|[?#]/.test(src.slice(1)) || !/^\/images\/[A-Za-z0-9._\-/%&()+, ]+$/.test(src)) {
      throw invalid(`${label} path must be a plain site path under /images/.`);
    }
    return src;
  }
  let url;
  try {
    url = new URL(src);
  } catch {
    throw invalid(`${label} must be an https URL or a /images/ path.`);
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw invalid(`${label} must be an https URL or a /images/ path.`);
  }
  return url.toString();
}

export function image(value, label = 'Image') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid(`${label} must be { src, alt }.`);
  requireBody(value, ['src', 'alt']);
  return { src: imageSrc(value.src, label), alt: text(value.alt, `${label} alt text`, { min: 2, max: 200 }) };
}

/** Escape user text for use inside a RegExp (search). */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Bounded pagination from query strings. */
export function pagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw invalid('page must be a whole number between 1 and 10000.');
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) throw invalid(`limit must be a whole number between 1 and ${maxLimit}.`);
  return { page, limit, skip: (page - 1) * limit };
}

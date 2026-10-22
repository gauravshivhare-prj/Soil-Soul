/**
 * URL builders for app routes — one place to change if paths move.
 * Plain module (no "use client") so server and client components share it.
 */

export function productHref(slug) {
  return `/products/${slug}`;
}

export function accountOrderHref(id) {
  return `/account/orders/${id}`;
}

export function adminOrderHref(id) {
  return `/admin/orders/${id}`;
}

export function adminProductHref(slug) {
  return `/admin/products/${slug}`;
}

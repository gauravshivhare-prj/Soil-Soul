/**
 * Catalog data from the backend, mapped to the product shape the storefront components use.
 * Prices and stock shown here are informational; the server re-validates everything in the
 * cart and at checkout. The API deliberately sends no ratings or review counts (none are genuine yet).
 */

import { apiRequest } from "@/lib/api";

function activeOptions(options) {
  const choices = (options?.choices ?? []).filter((c) => c && c.isActive !== false);
  return choices.length ? { ...options, choices } : null;
}

/** API product → component shape (see data/catalog.js header for the shape). */
export function toUiProduct(p) {
  const category = p.category && typeof p.category === "object" ? p.category : null;
  const firstImage = Array.isArray(p.images) && (p.images.find((image) => image?.isPrimary) || p.images[0])?.src
    ? (p.images.find((image) => image?.isPrimary) || p.images[0])
    : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categorySlug: category?.slug ?? p.categorySlug,
    category: {
      slug: category?.slug ?? p.categorySlug,
      name: category?.name ?? "",
      shortName: category?.shortName || category?.name || "",
    },
    price: p.price,
    mrp: p.mrp ?? null,
    stock: p.stock ?? 0,
    tags: p.tags ?? [],
    light: p.light ?? null,
    size: p.size ?? null,
    summary: p.summary ?? "",
    description: p.description ?? "",
    highlights: p.highlights ?? [],
    care: p.care ?? [],
    specs: (p.specs ?? []).map((s) => [s.label, s.value]),
    // Only variants that are available to buy are offered (the server rejects inactive ones anyway).
    options: activeOptions(p.options),
    soldCount: p.soldCount ?? 0,
    image: firstImage ? { src: firstImage.src, alt: firstImage.alt || p.name } : null,
    images: (p.images ?? []).filter((img) => img?.src),
    isFeatured: Boolean(p.isFeatured),
  };
}

/**
 * @param {{ page?, limit?, category?, search?, sort?, inStock?, featured?, priceMin?, priceMax?, tag? }} params
 */
export async function fetchProducts(params = {}, options = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) query.set(key, String(value));
  }
  const data = await apiRequest(`/products${query.size ? `?${query}` : ""}`, options);
  return { products: data.products.map(toUiProduct), pagination: data.pagination };
}

export async function fetchProduct(slug, options = {}) {
  const data = await apiRequest(`/products/${encodeURIComponent(slug)}`, options);
  return toUiProduct(data.product);
}

export async function fetchCategories(options = {}) {
  const data = await apiRequest("/categories", options);
  return data.categories;
}

/**
 * Sellable stock, using the same rule as checkout:
 * - a variant sells from its own stock, or from the product's shared stock when it has none;
 * - with no variant chosen, a product with variants counts every available variant (shared
 *   stock once); a product without variants uses its own stock.
 * Works for storefront products (inactive variants already removed) and admin products.
 */
export function availableStock(product, optionId = null) {
  const shared = typeof product.stock === "number" && product.stock > 0 ? product.stock : 0;
  const all = product.options?.choices ?? [];
  const active = all.filter((c) => c && c.isActive !== false);
  const own = (c) => (typeof c.stock === "number" ? Math.max(0, c.stock) : null);
  if (optionId) {
    const choice = active.find((c) => c.id === optionId);
    return choice ? own(choice) ?? shared : 0;
  }
  if (all.length === 0) return shared;
  const ownTotal = active.reduce((sum, c) => sum + (own(c) ?? 0), 0);
  return ownTotal + (active.some((c) => own(c) === null) ? shared : 0);
}

export const isInStock = (product, optionId = null) => availableStock(product, optionId) > 0;
/* Storefront stock wording: the exact count is shown only when fewer than this many are left. */
export const SHOW_COUNT_BELOW = 25;

/**
 * Stock status for shoppers: { status, label } for StatusBadge.
 * 0 or not set → "Out of Stock"; 1–24 → "Only N left"; 25 or more → "In Stock".
 */
export function stockDisplay(stock) {
  const n = typeof stock === "number" && Number.isFinite(stock) ? stock : 0;
  if (n <= 0) return { status: "out-of-stock", label: "Out of Stock" };
  if (n < SHOW_COUNT_BELOW) return { status: "low-stock", label: `Only ${n} left` };
  return { status: "in-stock", label: "In Stock" };
}

/* Default option: the zero-cost choice, else the first. */
export function defaultOptionId(product) {
  const choices = product.options?.choices;
  if (!choices?.length) return null;
  // Prefer a variant that can actually be bought, so "Add to cart" works when another is sold out.
  const sellable = choices.filter((c) => availableStock(product, c.id) > 0);
  const pool = sellable.length ? sellable : choices;
  return (pool.find((c) => (c.priceDelta ?? 0) === 0) ?? pool[0]).id;
}

const PAGE_LIMIT = 50;
const MAX_PAGES = 10;

/**
 * Every active product (bounded: at most MAX_PAGES × PAGE_LIMIT), for the shop's in-browser
 * filters, which offer more combinations than the API's single-category query.
 * @returns {Promise<{ products: Object[], truncated: boolean }>}
 */
export async function fetchAllProducts(options = {}) {
  const products = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchProducts({ page, limit: PAGE_LIMIT }, options);
    products.push(...data.products);
    if (!data.pagination.hasNextPage) return { products, truncated: false };
  }
  return { products, truncated: true };
}

/* Sort options backed by real data (no ratings; seeded sales counts are not used). */
export const SHOP_SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "popular", label: "Most Popular" },
  { id: "name", label: "Name: A to Z" },
];

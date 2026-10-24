/**
 * Catalog data from the backend, mapped to the product shape the storefront components use.
 * Prices and stock shown here are informational; the server re-validates everything in the
 * cart and at checkout. The API deliberately sends no ratings or review counts (none are genuine yet).
 */

import { apiRequest } from "@/lib/api";

/** API product → component shape (see data/catalog.js header for the shape). */
export function toUiProduct(p) {
  const category = p.category && typeof p.category === "object" ? p.category : null;
  const firstImage = Array.isArray(p.images) && p.images[0]?.src ? p.images[0] : null;
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
    options: p.options?.choices?.length ? p.options : null,
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

export const isInStock = (product) => product.stock > 0;
/* Default option: the zero-cost choice, else the first. */
export function defaultOptionId(product) {
  const choices = product.options?.choices;
  if (!choices?.length) return null;
  return (choices.find((c) => (c.priceDelta ?? 0) === 0) ?? choices[0]).id;
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
  { id: "name", label: "Name: A to Z" },
];

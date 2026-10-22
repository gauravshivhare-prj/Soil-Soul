/**
 * Catalog service — products, categories, collections and reviews.
 *
 * Reads local mock data for now. When the API is ready, replace these
 * functions with requests to the backend; the components only depend on
 * the shapes returned here, not on the data files.
 */

import { CATEGORIES } from "@/data/categories";
import {
  COLLECTIONS,
  FEATURED_SLUGS,
  LIGHT_LEVELS,
  NATURAL_CARE_SLUGS,
  PRODUCTS,
  PRODUCT_TAGS,
  SIZES,
} from "@/data/catalog";
import { SAMPLE_REVIEWS } from "@/data/reviews";

const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/* Attach a compact category object to a product. */
function withCategory(product) {
  const c = CATEGORY_BY_SLUG.get(product.categorySlug);
  return { ...product, category: { slug: c.slug, name: c.name, shortName: c.shortName } };
}

const ALL_PRODUCTS = PRODUCTS.map(withCategory);
const PRODUCT_BY_SLUG = new Map(ALL_PRODUCTS.map((p) => [p.slug, p]));

/* ─── Categories & collections ─────────────────────────────────── */
export function getCategories() {
  return CATEGORIES.map((c) => ({
    ...c,
    productCount: PRODUCTS.filter((p) => p.categorySlug === c.slug).length,
  }));
}

export function getCategory(slug) {
  return CATEGORY_BY_SLUG.get(slug) ?? null;
}

export function getCollection(id) {
  return COLLECTIONS[id] ?? null;
}

export function getFilterOptions() {
  const prices = PRODUCTS.map((p) => p.price);
  return {
    tags: PRODUCT_TAGS,
    lightLevels: LIGHT_LEVELS,
    sizes: SIZES,
    priceMin: 0,
    priceMax: Math.ceil(Math.max(...prices) / 100) * 100,
  };
}

/* ─── Products ─────────────────────────────────────────────────── */
export function getProducts() {
  return ALL_PRODUCTS;
}

export function getProduct(slug) {
  return PRODUCT_BY_SLUG.get(slug) ?? null;
}

export function getProductsBySlugs(slugs) {
  return slugs.map((s) => PRODUCT_BY_SLUG.get(s)).filter(Boolean);
}

export function getFeaturedProducts() {
  return getProductsBySlugs(FEATURED_SLUGS);
}

export function getNaturalCareSpotlight() {
  return getProductsBySlugs(NATURAL_CARE_SLUGS);
}

/* Same category first, then same collection, excluding the product itself. */
export function getRelatedProducts(slug, limit = 6) {
  const product = getProduct(slug);
  if (!product) return [];
  const group = Object.values(COLLECTIONS).find((c) => c.categories.includes(product.categorySlug));
  const others = ALL_PRODUCTS.filter((p) => p.slug !== slug);
  const sameCategory = others.filter((p) => p.categorySlug === product.categorySlug);
  const sameGroup = others.filter((p) => p.categorySlug !== product.categorySlug && group?.categories.includes(p.categorySlug));
  return [...sameCategory, ...sameGroup, ...others].filter((p, i, arr) => arr.indexOf(p) === i).slice(0, limit);
}

/* Default option: the zero-cost choice, else the first. */
export function defaultOptionId(product) {
  const choices = product.options?.choices;
  if (!choices) return null;
  return (choices.find((c) => c.priceDelta === 0) ?? choices[0]).id;
}

export function isInStock(product) {
  return product.stock > 0;
}

export function discountPercent(product) {
  if (!product.mrp || product.mrp <= product.price) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

/* ─── Search, filter & sort (Shop page) ────────────────────────── */
export const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
  { id: "popular", label: "Most Popular" },
  { id: "name", label: "Name: A to Z" },
];

/**
 * filters: { query, categories[], priceMin, priceMax, tags[], light[], sizes[], inStockOnly }
 * Empty arrays / null values mean "no restriction".
 */
export function filterProducts(products, filters) {
  const q = filters.query?.trim().toLowerCase() ?? "";
  return products.filter((p) => {
    if (q) {
      const haystack = `${p.name} ${p.category.name} ${p.category.shortName} ${p.summary}`.toLowerCase();
      if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    if (filters.categories?.length && !filters.categories.includes(p.categorySlug)) return false;
    if (filters.priceMin != null && p.price < filters.priceMin) return false;
    if (filters.priceMax != null && p.price > filters.priceMax) return false;
    if (filters.tags?.length && !filters.tags.some((t) => p.tags.includes(t))) return false;
    if (filters.light?.length && !filters.light.includes(p.light)) return false;
    if (filters.sizes?.length && !filters.sizes.includes(p.size)) return false;
    if (filters.inStockOnly && !isInStock(p)) return false;
    return true;
  });
}

export function sortProducts(products, sortId) {
  const list = [...products];
  switch (sortId) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "rating":
      return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "popular":
      return list.sort((a, b) => b.soldCount - a.soldCount);
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      // Featured: featured items first, then catalog order.
      return list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }
}

/* ─── Reviews ──────────────────────────────────────────────────── */
/**
 * Star distribution derived from the average so the bars always agree with
 * the headline rating. Demo only — real counts will come from the API.
 */
export function getReviewSummary(product) {
  const { rating, reviewCount } = product;
  const fiveShare = Math.max(0.3, Math.min(0.85, (rating - 3.4) / 1.6));
  const shares = [fiveShare, (1 - fiveShare) * 0.62, (1 - fiveShare) * 0.24, (1 - fiveShare) * 0.09, (1 - fiveShare) * 0.05];
  return {
    average: rating,
    count: reviewCount,
    distribution: [5, 4, 3, 2, 1].map((stars, i) => ({ stars, percent: Math.round(shares[i] * 100) })),
  };
}

export function getProductReviews() {
  return SAMPLE_REVIEWS;
}

/**
 * Catalog presentation helpers.
 *
 * Product and category records are loaded through catalogApi. This module only
 * contains deterministic client-side filtering/sorting for records already
 * returned by the backend; it never supplies catalog data.
 */

import { isInStock } from "@/services/catalogApi";
import { matchesProductSearch, normalizeSearchQuery } from "@/services/searchText.mjs";

export const COLLECTIONS = Object.freeze({
  plants: {
    title: "Plants",
    description: "Plants and growing essentials for the spaces you care for.",
    categories: ["plants"],
  },
  tools: {
    title: "Tools",
    description: "Practical tools for everyday gardening.",
    categories: ["tools"],
  },
  seeds: {
    title: "Seeds",
    description: "Seeds for your next planting project.",
    categories: ["seeds"],
  },
  "natural-products": {
    title: "Natural Products",
    description: "A small selection of relevant natural-care products.",
    categories: ["natural-products"],
  },
});

export function getCollection(id) {
  return COLLECTIONS[id] ?? null;
}

export function filterProducts(products, filters = {}) {
  const query = normalizeSearchQuery(filters.query);
  return products.filter((product) => {
    if (query && !matchesProductSearch(product, query)) return false;
    if (filters.categories?.length && !filters.categories.includes(product.categorySlug)) return false;
    if (filters.priceMin != null && product.price < filters.priceMin) return false;
    if (filters.priceMax != null && product.price > filters.priceMax) return false;
    if (filters.tags?.length && !filters.tags.some((tag) => product.tags?.includes(tag))) return false;
    if (filters.light?.length && !filters.light.includes(product.light)) return false;
    if (filters.sizes?.length && !filters.sizes.includes(product.size)) return false;
    // Variant-aware: a product with variants is in stock when any available variant is.
    if (filters.inStockOnly && !isInStock(product)) return false;
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
    case "popular":
      return list.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }
}

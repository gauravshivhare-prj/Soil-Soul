/**
 * Catalog presentation helpers.
 *
 * Product and category records are loaded through catalogApi. This module only
 * contains deterministic client-side filtering/sorting for records already
 * returned by the backend; it never supplies catalog data.
 */

import { isInStock } from "@/services/catalogApi";

export const COLLECTIONS = Object.freeze({
  plants: {
    title: "Live Plants",
    description: "Bring a little more green into every room and balcony.",
    categories: ["live-plants"],
  },
  gardening: {
    title: "Gardening",
    description: "Everything you need to grow with confidence.",
    categories: ["pots-planters", "soil-fertilizers", "seeds-tools"],
  },
  "natural-care": {
    title: "Natural Care",
    description: "Skincare and personal care powered by nature's best.",
    categories: ["natural-skincare", "hair-body-care"],
  },
});

export function getCollection(id) {
  return COLLECTIONS[id] ?? null;
}

export function filterProducts(products, filters = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return products.filter((product) => {
    if (query) {
      const category = product.category ?? {};
      const haystack = `${product.name} ${category.name ?? ""} ${category.shortName ?? ""} ${product.summary ?? ""}`.toLowerCase();
      if (!query.split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
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

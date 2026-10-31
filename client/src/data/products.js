/**
 * Homepage "Featured Products" filter pills.
 *
 * Product data lives in data/catalog.js (read via services/catalog.js).
 */

/**
 * Main catalogue groups used by storefront filter controls.
 * `categories: null` means "show everything".
 */
export const FEATURED_FILTERS = [
  { id: "all", label: "All", categories: null },
  { id: "plants", label: "Plants", categories: ["plants"] },
  { id: "tools", label: "Tools", categories: ["tools"] },
  { id: "seeds", label: "Seeds", categories: ["seeds"] },
  { id: "natural-products", label: "Natural Products", categories: ["natural-products"] },
];

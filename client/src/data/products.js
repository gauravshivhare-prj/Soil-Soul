/**
 * Homepage "Featured Products" filter pills.
 *
 * Product data lives in data/catalog.js (read via services/catalog.js).
 */

/**
 * Filter pills for the Featured Products section, in display order.
 * `categories: null` means "show everything". "Natural Care" groups the
 * skincare and hair & body categories.
 */
export const FEATURED_FILTERS = [
  { id: "all", label: "All", categories: null },
  { id: "plants", label: "Plants", categories: ["live-plants"] },
  { id: "pots-planters", label: "Pots & Planters", categories: ["pots-planters"] },
  { id: "soil-fertilizers", label: "Soil & Fertilizers", categories: ["soil-fertilizers"] },
  { id: "natural-care", label: "Natural Care", categories: ["natural-skincare", "hair-body-care"] },
];

/**
 * Featured products — temporary local mock data.
 *
 * Shaped like the future backend response so the array can be swapped for
 * an API call without touching the components that render it:
 *   { id, slug, name, category: { slug, name }, price, rating, reviewCount, image }
 *
 * - `price` is in whole rupees.
 * - `category.slug` matches the slugs in data/categories.js.
 * - `image` is null until real product photos are added; the card renders a
 *   blank placeholder area in that case.
 * - `rating` / `reviewCount` are placeholder values until reviews exist.
 */

export const FEATURED_PRODUCTS = [
  {
    id: "monstera-deliciosa",
    slug: "monstera-deliciosa",
    name: "Monstera Deliciosa",
    category: { slug: "live-plants", name: "Live Plants" },
    price: 699,
    rating: 4.5,
    reviewCount: 126,
    image: null,
  },
  {
    id: "terracotta-plant-pot",
    slug: "terracotta-plant-pot",
    name: "Terracotta Plant Pot",
    category: { slug: "pots-planters", name: "Pots & Planters" },
    price: 249,
    rating: 4.4,
    reviewCount: 86,
    image: null,
  },
  {
    id: "organic-potting-soil-5kg",
    slug: "organic-potting-soil-5kg",
    name: "Organic Potting Soil (5kg)",
    category: { slug: "soil-fertilizers", name: "Soil & Fertilizers" },
    price: 349,
    rating: 4.6,
    reviewCount: 98,
    image: null,
  },
  {
    id: "basil-seeds",
    slug: "basil-seeds",
    name: "Basil Seeds",
    category: { slug: "seeds-tools", name: "Seeds & Tools" },
    price: 149,
    rating: 4.3,
    reviewCount: 72,
    image: null,
  },
  {
    id: "aloe-vera-gel",
    slug: "aloe-vera-gel",
    name: "Aloe Vera Gel",
    category: { slug: "natural-skincare", name: "Natural Care" },
    price: 399,
    rating: 4.7,
    reviewCount: 156,
    image: null,
  },
  {
    id: "herbal-shampoo",
    slug: "herbal-shampoo",
    name: "Herbal Shampoo",
    category: { slug: "hair-body-care", name: "Hair & Body Care" },
    price: 349,
    rating: 4.6,
    reviewCount: 65,
    image: null,
  },
];

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

/**
 * Natural care spotlight — products for the "Natural Care, Rooted in Plants"
 * section. Same shape as FEATURED_PRODUCTS plus `benefits` (short labels
 * shown as "Soothes • Hydrates • Repairs").
 */
export const NATURAL_CARE_PRODUCTS = [
  {
    id: "aloe-vera-gel",
    slug: "aloe-vera-gel",
    name: "Aloe Vera Gel",
    category: { slug: "natural-skincare", name: "Natural Care" },
    price: 399,
    benefits: ["Soothes", "Hydrates", "Repairs"],
    image: null,
  },
  {
    id: "neem-face-wash",
    slug: "neem-face-wash",
    name: "Neem Face Wash",
    category: { slug: "natural-skincare", name: "Natural Care" },
    price: 249,
    benefits: ["Purifies", "Refreshes", "Balances"],
    image: null,
  },
  {
    id: "herbal-shampoo",
    slug: "herbal-shampoo",
    name: "Herbal Shampoo",
    category: { slug: "hair-body-care", name: "Hair & Body Care" },
    price: 349,
    benefits: ["Strengthens", "Nourishes", "Adds Shine"],
    image: null,
  },
];

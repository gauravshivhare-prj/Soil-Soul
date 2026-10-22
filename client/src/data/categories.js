/**
 * Storefront categories — temporary local data.
 *
 * Shaped like the future backend response so the array can be swapped for
 * an API call without touching the components that render it:
 *   { id, slug, name, shortName, tagline, image: { src, alt } }
 *
 * `shortName` is used on badges and filters ("Natural Care" for skincare).
 *
 * Images live in public/images/categories/ (square, 1254 × 1254).
 */

export const CATEGORIES = [
  {
    id: "live-plants",
    slug: "live-plants",
    shortName: "Live Plants",
    name: "Live Plants",
    tagline: "Indoor, outdoor & more",
    image: {
      src: "/images/categories/live-plants.png",
      alt: "Leafy green houseplant in a stone pot surrounded by trailing plants",
    },
  },
  {
    id: "pots-planters",
    slug: "pots-planters",
    shortName: "Pots & Planters",
    name: "Pots & Planters",
    tagline: "For every space",
    image: {
      src: "/images/categories/pots-planters.png",
      alt: "Four terracotta pots in different sizes beside trailing pothos",
    },
  },
  {
    id: "soil-fertilizers",
    slug: "soil-fertilizers",
    shortName: "Soil & Fertilizers",
    name: "Soil & Fertilizers",
    tagline: "Healthy soil, healthy plants",
    image: {
      src: "/images/categories/soil-fertilizers.png",
      alt: "Bag of organic potting soil with a trowel and loose soil",
    },
  },
  {
    id: "seeds-tools",
    slug: "seeds-tools",
    shortName: "Seeds & Tools",
    name: "Seeds & Tools",
    tagline: "Grow your own",
    image: {
      src: "/images/categories/seeds-tools.png",
      alt: "Tomato and basil seed packets with seedlings, a trowel and a watering can",
    },
  },
  {
    id: "natural-skincare",
    slug: "natural-skincare",
    shortName: "Natural Care",
    name: "Natural Skincare",
    tagline: "Pure plant power",
    image: {
      src: "/images/categories/natural-skincare.png",
      alt: "Aloe vera gel, neem face wash and face cream beside an aloe plant",
    },
  },
  {
    id: "hair-body-care",
    slug: "hair-body-care",
    shortName: "Hair & Body Care",
    name: "Hair & Body Care",
    tagline: "Gentle & natural",
    image: {
      src: "/images/categories/hair-body-care.png",
      alt: "Herbal shampoo, natural soap bar, hair oil and wooden brush",
    },
  },
];

/* Category listing URL — single place to change once routes exist. */
export function categoryHref(slug) {
  return `/shop/${slug}`;
}

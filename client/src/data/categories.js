/**
 * Storefront categories — temporary local data.
 *
 * Shaped like the future backend response so the array can be swapped for
 * an API call without touching the components that render it:
 *   { id, slug, name, tagline, image: { src, alt } }
 *
 * Images live in public/images/categories/ (square, 1254 × 1254).
 */

export const CATEGORIES = [
  {
    id: "live-plants",
    slug: "live-plants",
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

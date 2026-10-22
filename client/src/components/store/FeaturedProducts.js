"use client";

/**
 * FeaturedProducts — homepage product grid with category filter pills.
 *
 * Client Component: the filter pills hold local state and filter the
 * product list in the browser. Receives products/filters as props
 * (defaulting to local mock data) so it can later take API results.
 *
 * Layout matches ShopByCategory: 2 columns on mobile, 3 on tablet, all 6
 * in one row from `lg`. Filter pills scroll horizontally on small screens.
 *
 * Presentational only for now:
 *   - Image area is a blank cream placeholder until product photos exist.
 *   - Heart is decorative (hidden from assistive tech, not focusable).
 *   - "Add to Cart" has no cart behaviour yet.
 */

import { useState } from "react";
import { brandSerif } from "@/app/fonts";
import { FEATURED_FILTERS, FEATURED_PRODUCTS } from "@/data/products";
import { formatPrice } from "@/lib/format";

/* ─── Icons ─────────────────────────────────────────────────────── */
function HeartIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const STAR_PATH =
  "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z";

/* Five stars with a partial fill for fractional ratings. */
function Stars({ rating }) {
  return (
    <span className="relative inline-flex flex-shrink-0" aria-hidden="true">
      <span className="flex gap-px text-[#e3ddd0]">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="currentColor" focusable="false">
            <path d={STAR_PATH} />
          </svg>
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 flex gap-px overflow-hidden text-[#e5a43b]"
        style={{ width: `${(rating / 5) * 100}%` }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="currentColor" focusable="false" className="flex-shrink-0">
            <path d={STAR_PATH} />
          </svg>
        ))}
      </span>
    </span>
  );
}

/* ─── Card ──────────────────────────────────────────────────────── */
function ProductCard({ product }) {
  const { name, category, price, rating, reviewCount } = product;

  return (
    <article
      className="flex flex-col h-full overflow-hidden rounded-xl bg-white border border-[#ebe6da]
                 shadow-[0_1px_3px_rgba(36,69,42,0.05)]
                 transition-[transform,box-shadow,border-color] duration-300 ease-out
                 hover:-translate-y-1 hover:border-[#dcd5c4] hover:shadow-[0_12px_28px_rgba(36,69,42,0.12)]
                 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Blank image area — product photos will be added later */}
      <div className="relative aspect-[25/24] bg-gradient-to-b from-[#f6f2e9] to-[#efe9dc]">
        <span
          className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex items-center justify-center
                     w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 text-[#24452a]
                     shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          aria-hidden="true"
        >
          <HeartIcon />
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col px-2.5 pt-3 pb-3 sm:px-3">
        <span
          className="self-start max-w-full truncate rounded-full bg-[#eef0e3] px-2 py-0.5
                     text-[0.625rem] sm:text-[0.6875rem] font-medium text-[#3d5a35]"
        >
          {category.name}
        </span>

        <h3 className="m-0 mt-2 text-[0.8125rem] sm:text-sm 2xl:text-[0.9375rem] font-semibold leading-snug text-[#1b2a1c]">
          {name}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars rating={rating} />
          <span className="text-[0.625rem] sm:text-[0.6875rem] text-[#8a8f84]">
            <span className="sr-only">Rated </span>
            {rating.toFixed(1)}
            <span className="sr-only"> out of 5,</span> ({reviewCount}
            <span className="sr-only"> reviews</span>)
          </span>
        </div>

        <p className="m-0 mt-auto pt-2.5 text-base sm:text-lg font-bold text-[#1b2a1c]">
          {formatPrice(price)}
        </p>

        <button
          type="button"
          className="mt-2.5 sm:mt-3 w-full h-9 rounded-md border-0 cursor-pointer
                     bg-[#24452a] text-[#f4f1e8] text-[0.8125rem] font-medium
                     transition-colors duration-200 hover:bg-[#1b3520]
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
        >
          Add to Cart
          <span className="sr-only">: {name}</span>
        </button>
      </div>
    </article>
  );
}

/* ─── Section ───────────────────────────────────────────────────── */
export default function FeaturedProducts({
  products = FEATURED_PRODUCTS,
  filters = FEATURED_FILTERS,
}) {
  const [activeId, setActiveId] = useState(filters[0].id);

  const activeFilter = filters.find((f) => f.id === activeId) ?? filters[0];
  const visible = activeFilter.categories
    ? products.filter((p) => activeFilter.categories.includes(p.category.slug))
    : products;

  return (
    <section aria-labelledby="featured-products-heading" className="bg-[#faf8f2] pb-8 lg:pb-10">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5 sm:mb-6 lg:mb-7">
          <div className="min-w-0">
            <h2
              id="featured-products-heading"
              className={`${brandSerif.className} m-0 font-bold text-[#1f3d24] leading-tight
                          text-[1.5rem] sm:text-[1.75rem] xl:text-[2rem]`}
            >
              Featured Products
            </h2>
            <p className="m-0 mt-1.5 text-[0.8125rem] sm:text-sm leading-relaxed text-[#5e6858]">
              Handpicked for a greener, healthier lifestyle.
            </p>
          </div>

          {/* Filter pills — scroll sideways on narrow screens */}
          <div
            role="group"
            aria-label="Filter featured products by category"
            className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 lg:pb-0
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {filters.map((filter) => {
              const active = filter.id === activeFilter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveId(filter.id)}
                  className={`flex-shrink-0 h-9 px-4 sm:px-5 rounded-full border-0 cursor-pointer whitespace-nowrap
                              text-[0.8125rem] font-medium transition-colors duration-200
                              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]
                              ${active
                                ? "bg-[#24452a] text-[#f4f1e8]"
                                : "bg-[#efece3] text-[#2b3128] hover:bg-[#e5e0d2]"}`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result count for screen readers when the filter changes */}
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} {visible.length === 1 ? "product" : "products"}
        </p>

        {/* Grid */}
        {visible.length > 0 ? (
          <ul
            role="list"
            className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 xl:gap-5"
          >
            {visible.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 py-10 text-center text-sm text-[#5e6858]">
            No featured products in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}

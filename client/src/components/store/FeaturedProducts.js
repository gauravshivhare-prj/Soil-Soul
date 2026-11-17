"use client";

/**
 * FeaturedProducts — homepage product slider with category filter pills.
 *
 * Client Component: renders products in a sleek single-line horizontal slider
 * with smooth arrow navigation buttons (< and >) and category filter pills.
 */

import { useState, useRef } from "react";
import { brandSerif } from "@/app/fonts";
import { fetchProducts } from "@/services/catalogApi";
import { useProductList } from "@/features/catalog/useProductList";
import { FEATURED_FILTERS } from "@/data/products";
import ProductCard from "@/components/store/ProductCard";
import Icon from "@/components/ui/Icon";
import { ProductGridSkeleton } from "@/components/ui/States";

const loadFeatured = (signal, category) =>
  fetchProducts(
    { featured: true, limit: 16, ...(category ? { category } : {}) },
    { signal }
  ).then(async (d) => {
    if (d?.products && d.products.length > 0) return d.products;
    const fallback = await fetchProducts(
      { limit: 16, ...(category ? { category } : {}) },
      { signal }
    );
    return fallback?.products ?? [];
  });

/* ─── Section ───────────────────────────────────────────────────── */
export default function FeaturedProducts() {
  const [activeId, setActiveId] = useState("all");
  const filters = FEATURED_FILTERS;
  const activeFilter = filters.find((f) => f.id === activeId) ?? filters[0];
  const { status, products } = useProductList(
    (signal) => loadFeatured(signal, activeFilter.categories?.[0]),
    `featured:${activeFilter.id}`
  );

  const sliderRef = useRef(null);

  const scroll = (direction) => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Nothing featured (or the store is unreachable): hide the section rather than show placeholders.
  if (status === "error" || (status === "ready" && products.length === 0)) return null;

  const visible = products;

  return (
    <section aria-labelledby="featured-products-heading" className="bg-[#faf8f2] pb-10 lg:pb-14 pt-2">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4 sm:mb-6">
          <div className="min-w-0">
            <h2
              id="featured-products-heading"
              className={`${brandSerif.className} m-0 font-bold text-[#1f3d24] leading-tight
                          text-[1.375rem] sm:text-[1.5rem] xl:text-[1.75rem]`}
            >
              Featured Products
            </h2>
            <p className="m-0 mt-1 text-[0.8125rem] sm:text-sm leading-relaxed text-[#5e6858]">
              Handpicked for a greener, healthier lifestyle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                    className={`flex-shrink-0 h-8 px-3.5 sm:px-4 rounded-full border-0 cursor-pointer whitespace-nowrap
                                text-xs font-medium transition-colors duration-200
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]
                                ${active
                                  ? "bg-[#24452a] text-[#f4f1e8] shadow-xs font-semibold"
                                  : "bg-[#efece3] text-[#2b3128] hover:bg-[#e5e0d2]"}`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Desktop / Tablet slider navigation buttons */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 pl-1">
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Previous products"
                className="w-8 h-8 rounded-full border border-[#d8d3c5] bg-white shadow-xs flex items-center justify-center text-ink hover:bg-forest hover:text-cream hover:border-forest transition-colors cursor-pointer"
              >
                <Icon name="chevron-left" size={15} />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Next products"
                className="w-8 h-8 rounded-full border border-[#d8d3c5] bg-white shadow-xs flex items-center justify-center text-ink hover:bg-forest hover:text-cream hover:border-forest transition-colors cursor-pointer"
              >
                <Icon name="chevron-right" size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Result count for screen readers */}
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} {visible.length === 1 ? "product" : "products"}
        </p>

        {/* Single Line Sliding Track */}
        {status === "loading" ? (
          <ProductGridSkeleton count={6} className="sm:grid-cols-3 lg:grid-cols-6" />
        ) : visible.length > 0 ? (
          <div className="relative group/slider">
            <ul
              ref={sliderRef}
              role="list"
              className="list-none m-0 p-0 flex gap-3.5 sm:gap-4.5 overflow-x-auto scroll-smooth pb-3 pt-1
                         snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {visible.map((product) => (
                <li
                  key={product.id}
                  className="snap-start shrink-0 w-[175px] sm:w-[215px] md:w-[235px] lg:w-[245px] xl:w-[250px]"
                >
                  <ProductCard product={product} sizes="(min-width: 1280px) 250px, (min-width: 768px) 235px, 175px" />
                </li>
              ))}
            </ul>

            {/* Mobile edge navigation buttons */}
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-line shadow-md text-ink flex items-center justify-center z-10 -ml-2"
            >
              <Icon name="chevron-left" size={14} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-line shadow-md text-ink flex items-center justify-center z-10 -mr-2"
            >
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        ) : (
          <p className="m-0 py-10 text-center text-sm text-[#5e6858]">
            No featured products in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

/**
 * FeaturedProducts — homepage product grid with category filter pills.
 *
 * Client Component: the filter pills hold local state and filter the
 * product list in the browser. Products come from the catalog service
 * (or a `products` prop) and render with the shared ProductCard.
 *
 * Layout matches ShopByCategory: 2 columns on mobile, 3 on tablet, all 6
 * in one row from `lg`. Filter pills scroll horizontally on small screens.
 *
 * Image areas stay blank cream placeholders until product photos exist.
 */

import { useState } from "react";
import { brandSerif } from "@/app/fonts";
import { fetchProducts } from "@/services/catalogApi";
import { useProductList } from "@/features/catalog/useProductList";
import { FEATURED_FILTERS } from "@/data/products";
import ProductCard from "@/components/store/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/States";

const loadFeatured = (signal, category) => fetchProducts({ featured: true, limit: 12, ...(category ? { category } : {}) }, { signal }).then((d) => d.products);

/* ─── Section ───────────────────────────────────────────────────── */
export default function FeaturedProducts() {
  const [activeId, setActiveId] = useState("all");
  const filters = FEATURED_FILTERS;
  const activeFilter = filters.find((f) => f.id === activeId) ?? filters[0];
  const { status, products } = useProductList(
    (signal) => loadFeatured(signal, activeFilter.categories?.[0]),
    `featured:${activeFilter.id}`
  );

  // Nothing featured (or the store is unreachable): hide the section rather than show placeholders.
  if (status === "error" || (status === "ready" && products.length === 0)) return null;

  const visible = products;

  return (
    <section aria-labelledby="featured-products-heading" className="bg-[#faf8f2] pb-8 lg:pb-10">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4 sm:mb-5">
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
        {status === "loading" ? (
          <ProductGridSkeleton count={6} className="sm:grid-cols-3 lg:grid-cols-6" />
        ) : visible.length > 0 ? (
          <ul
            role="list"
            className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 xl:gap-5"
          >
            {visible.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw" />
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

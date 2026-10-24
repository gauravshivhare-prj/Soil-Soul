"use client";

/**
 * ShopByCategory — homepage category grid.
 *
 * Server Component. Renders whatever category list it is given (defaults to
 * the local CATEGORIES data), so it can later receive API results unchanged.
 *
 * Layout: 2 columns on mobile, 3 on tablet, all 6 in one row from `lg`.
 *
 * Each card is a single link to its category. The heart in the image corner
 * is decorative only (no wishlist action yet), so it is hidden from
 * assistive tech and not focusable.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { brandSerif } from "@/app/fonts";
import { fetchCategories } from "@/services/catalogApi";
import { FormMessage, Skeleton } from "@/components/ui/States";

const categoryHref = (slug) => `/shop/${slug}`;

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

function ArrowRightIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ─── Card ──────────────────────────────────────────────────────── */
function CategoryCard({ category }) {
  const { slug, name, tagline, image } = category;

  return (
    <Link
      href={categoryHref(slug)}
      className="group flex flex-col h-full overflow-hidden rounded-xl no-underline
                 bg-white border border-[#ebe6da] shadow-[0_1px_3px_rgba(36,69,42,0.05)]
                 transition-[transform,box-shadow,border-color] duration-300 ease-out
                 hover:-translate-y-1 hover:border-[#dcd5c4] hover:shadow-[0_12px_28px_rgba(36,69,42,0.12)]
                 motion-reduce:transition-none motion-reduce:hover:translate-y-0
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#f1ece1]">
        {image?.src ? (
          <Image
            src={image.src}
            alt={image.alt || name}
            fill
            sizes="(min-width: 1536px) 240px, (min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105
                       motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : <span className="absolute inset-0 bg-gradient-to-br from-sage-100 to-sand" aria-label={`${name} category`} />}
        <span
          className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex items-center justify-center
                     w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 text-[#24452a]
                     shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          aria-hidden="true"
        >
          <HeartIcon />
        </span>
      </div>

      {/* Text */}
      <div className="flex flex-1 items-center gap-1.5 sm:gap-2 px-2.5 py-2.5 sm:px-3.5 sm:py-3">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-[0.8125rem] sm:text-sm 2xl:text-[0.9375rem] font-semibold leading-snug text-[#1b2a1c]">
            {name}
          </h3>
          <p className="m-0 mt-0.5 text-[0.6875rem] sm:text-xs leading-snug text-[#6a7264]">
            {tagline}
          </p>
        </div>
        <span
          className="flex flex-shrink-0 items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full
                     border border-[#d9dccb] text-[#24452a]
                     transition-colors duration-200
                     group-hover:bg-[#24452a] group-hover:border-[#24452a] group-hover:text-white"
          aria-hidden="true"
        >
          <ArrowRightIcon />
        </span>
      </div>
    </Link>
  );
}

/* ─── Section ───────────────────────────────────────────────────── */
export default function ShopByCategory() {
  const [state, setState] = useState({ status: "loading", categories: [], error: null });
  useEffect(() => {
    const controller = new AbortController();
    fetchCategories({ signal: controller.signal })
      .then((categories) => setState({ status: "ready", categories, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: "error", categories: [], error });
      });
    return () => controller.abort();
  }, []);

  if (state.status === "loading") return <Skeleton className="mx-4 h-48 sm:mx-8 xl:mx-10" />;
  if (state.status === "error") {
    return <FormMessage tone="error" className="mx-4 sm:mx-8 xl:mx-10">Categories could not be loaded. Please try again later.</FormMessage>;
  }
  if (state.categories.length === 0) return null;
  const categories = state.categories;

  return (
    <section aria-labelledby="shop-by-category-heading" className="bg-[#faf8f2] pt-8 pb-8 sm:pt-9 lg:pt-10 lg:pb-10">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h2
              id="shop-by-category-heading"
              className={`${brandSerif.className} m-0 font-bold text-[#1f3d24] leading-tight
                          text-[1.375rem] sm:text-[1.5rem] xl:text-[1.75rem]`}
            >
              Shop by Category
            </h2>
            <p className="m-0 mt-1 text-[0.8125rem] sm:text-sm leading-relaxed text-[#5e6858]">
              Explore our wide range of plants, gardening supplies and natural care products.
            </p>
          </div>
          <Link
            href="/shop"
            className="group inline-flex flex-shrink-0 items-center gap-1.5 pb-1 text-[0.8125rem] sm:text-sm font-semibold
                       text-[#24452a] no-underline whitespace-nowrap hover:text-[#1b3520]
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a] rounded"
          >
            <span>
              View All<span className="hidden sm:inline"> Categories</span>
            </span>
            <span className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
              <ArrowRightIcon size={15} />
            </span>
          </Link>
        </div>

        {/* Grid */}
        <ul
          role="list"
          className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 xl:gap-5"
        >
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

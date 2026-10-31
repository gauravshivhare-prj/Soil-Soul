"use client";

/**
 * Natural products spotlight, intentionally secondary to the main plant catalogue.
 *
 * Client Component. Loads up to three live products from Natural Products;
 * hidden while loading, on error, or when empty.
 *
 * Card layout:
 *   below sm — one column, image beside details.
 *   sm–lg    — three columns, image above details.
 *   lg+      — three columns, image beside details (as in the design).
 *
 * The image area is a blank cream placeholder until product photos exist.
 */

import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { fetchProducts } from "@/services/catalogApi";
import { useProductList } from "@/features/catalog/useProductList";
import { productHref } from "@/lib/routes";
import { formatPrice } from "@/lib/format";

const loadSpotlight = (signal) => fetchProducts({ category: "natural-products", limit: 3 }, { signal }).then((data) => data.products);

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
      className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ─── Card ──────────────────────────────────────────────────────── */
function NaturalCareCard({ product }) {
  const { slug, name, price } = product;
  const benefits = (product.highlights ?? []).slice(0, 3);

  return (
    <article
      className="flex h-full gap-4 p-3 sm:flex-col sm:gap-3 lg:flex-row lg:items-center lg:gap-5 xl:gap-6
                 rounded-xl bg-white border border-[#ebe6da] shadow-[0_1px_3px_rgba(36,69,42,0.05)]
                 transition-[transform,box-shadow,border-color] duration-300 ease-out
                 hover:-translate-y-1 hover:border-[#dcd5c4] hover:shadow-[0_12px_28px_rgba(36,69,42,0.12)]
                 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Blank image area — product photos will be added later */}
      <div
        className="flex-shrink-0 w-[38%] sm:w-full lg:w-[40%] aspect-square sm:aspect-[4/3] lg:aspect-square
                   rounded-lg bg-gradient-to-b from-[#f6f2e9] to-[#efe9dc]"
        aria-hidden="true"
      />

      {/* Details */}
      <div className="flex flex-1 min-w-0 flex-col justify-center py-1 sm:px-1 sm:pb-1 lg:p-0">
        <h3 className="m-0 text-[0.9375rem] xl:text-base font-semibold leading-snug text-[#1b2a1c]">
          {name}
        </h3>
        <p className="m-0 mt-1.5 text-xs xl:text-[0.8125rem] leading-snug text-[#6a7264]">
          {benefits.join(" • ")}
        </p>
        <p className="m-0 mt-2.5 text-lg font-bold text-[#1b2a1c]">
          {formatPrice(price)}
        </p>
        <Link
          href={productHref(slug)}
          className="group mt-3 self-start inline-flex items-center gap-1.5 h-8 px-4 rounded-md
                     bg-[#24452a] text-[#f4f1e8] text-xs font-medium no-underline whitespace-nowrap
                     transition-colors duration-200 hover:bg-[#1b3520]
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
        >
          Shop Now
          <span className="sr-only">: {name}</span>
          <ArrowRightIcon />
        </Link>
      </div>
    </article>
  );
}

/* ─── Section ───────────────────────────────────────────────────── */
export default function NaturalCare() {
  const { status, products } = useProductList(loadSpotlight, "natural-care-spotlight");
  // Only real products: hide the section while loading, on error, or when there are none.
  if (status !== "ready" || products.length === 0) return null;
  return (
    <section aria-labelledby="natural-care-heading" className="bg-[#faf8f2] pb-8 lg:pb-10">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h2
              id="natural-care-heading"
              className={`${brandSerif.className} m-0 font-bold text-[#1f3d24] leading-tight
                          text-[1.375rem] sm:text-[1.5rem] xl:text-[1.75rem]`}
            >
              Natural Products
            </h2>
            <p className="m-0 mt-1 text-[0.8125rem] sm:text-sm leading-relaxed text-[#5e6858]">
              A small supporting collection of Natural Products.
            </p>
          </div>
          <Link
            href="/shop/natural-products"
            className="group inline-flex flex-shrink-0 items-center gap-1.5 pb-1 text-[0.8125rem] sm:text-sm font-semibold
                       text-[#24452a] no-underline whitespace-nowrap hover:text-[#1b3520]
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a] rounded"
          >
            <span>
              View All<span className="hidden sm:inline"> Natural Products</span>
            </span>
            <ArrowRightIcon size={15} />
          </Link>
        </div>

        {/* Cards */}
        <ul role="list" className="list-none m-0 p-0 grid gap-3 sm:grid-cols-3 sm:gap-4 xl:gap-5">
          {products.map((product) => (
            <li key={product.id}>
              <NaturalCareCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

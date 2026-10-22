/**
 * NaturalCare — "Natural Care, Rooted in Plants" product spotlight.
 *
 * Server Component. Renders the product list it is given (defaults to the
 * local NATURAL_CARE_PRODUCTS mock data) so it can later take API results.
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
import { NATURAL_CARE_PRODUCTS } from "@/data/products";
import { formatPrice } from "@/lib/format";

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
  const { name, price, benefits } = product;

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
        className="flex-shrink-0 w-[38%] sm:w-full lg:w-[42%] aspect-square sm:aspect-[4/3] lg:aspect-[20/21]
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
        <p className="m-0 mt-3 xl:mt-4 text-lg xl:text-xl font-bold text-[#1b2a1c]">
          {formatPrice(price)}
        </p>
        <Link
          href="/natural-care"
          className="group mt-3 xl:mt-4 self-start inline-flex items-center gap-1.5 h-9 px-4 rounded-md
                     bg-[#24452a] text-[#f4f1e8] text-[0.8125rem] font-medium no-underline whitespace-nowrap
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
export default function NaturalCare({ products = NATURAL_CARE_PRODUCTS }) {
  return (
    <section aria-labelledby="natural-care-heading" className="bg-[#faf8f2] pb-12 lg:pb-16">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6 lg:mb-7">
          <div className="min-w-0">
            <h2
              id="natural-care-heading"
              className={`${brandSerif.className} m-0 font-bold text-[#1f3d24] leading-tight
                          text-[1.5rem] sm:text-[1.75rem] xl:text-[2rem]`}
            >
              Natural Care, Rooted in Plants
            </h2>
            <p className="m-0 mt-1.5 text-[0.8125rem] sm:text-sm leading-relaxed text-[#5e6858]">
              Skincare and personal care powered by nature&rsquo;s best.
            </p>
          </div>
          <Link
            href="/natural-care"
            className="group inline-flex flex-shrink-0 items-center gap-1.5 pb-1 text-[0.8125rem] sm:text-sm font-semibold
                       text-[#24452a] no-underline whitespace-nowrap hover:text-[#1b3520]
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a] rounded"
          >
            <span>
              View All<span className="hidden sm:inline"> Natural Care</span>
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

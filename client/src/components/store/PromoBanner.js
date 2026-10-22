/**
 * PromoBanner — "Make Room for More Green" gardening promotion.
 *
 * Server Component. The artwork already contains the dark-green panel and
 * line-art leaves on its left third, so the copy is laid over that area.
 *
 * Layout:
 *   lg and up — image cropped to a 4:1 strip, copy over the green panel.
 *   below lg  — copy on solid green first, then the photo cropped towards
 *               the products (a 3:1 banner would be too thin to read).
 */

import Image from "next/image";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";

const BANNER_IMAGE = "/images/Soil & Soul Garden Still Life.png";

/* Matches the green panel baked into the artwork. */
const PANEL_GREEN = "#1f4a2b";

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function PromoBanner() {
  return (
    <section aria-labelledby="promo-banner-heading" className="bg-[#faf8f2] pb-5 lg:pb-6">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 xl:px-10">
        <div
          className="relative flex flex-col lg:block overflow-hidden rounded-2xl lg:aspect-[4/1]"
          style={{ backgroundColor: PANEL_GREEN }}
        >
          {/* Photo */}
          <div className="relative order-2 aspect-[4/3] sm:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto">
            <Image
              src={BANNER_IMAGE}
              alt="Potted plant, terracotta pots, organic compost, trowel and watering can on a wooden table"
              fill
              sizes="(min-width: 1536px) 1456px, (min-width: 1024px) 100vw, (min-width: 640px) 170vw, 230vw"
              className="object-cover object-[78%_center] lg:object-[center_60%]"
            />
            {/* Mobile: blend the photo's top edge into the green copy panel */}
            <div
              className="lg:hidden absolute inset-x-0 top-0 h-16"
              style={{ backgroundImage: `linear-gradient(to bottom, ${PANEL_GREEN}, transparent)` }}
            />
          </div>

          {/* Copy */}
          <div
            className="relative z-[1] order-1 px-6 pt-8 pb-5 sm:px-8
                       lg:absolute lg:inset-y-0 lg:left-0 lg:w-[42%] lg:p-0 lg:pl-[7.5%] lg:flex lg:items-center"
          >
            <div>
              <h2
                id="promo-banner-heading"
                className={`${brandSerif.className} m-0 font-semibold leading-[1.12] text-[#f7f3e8]
                            text-[1.85rem] sm:text-[2.2rem] lg:text-[clamp(1.5rem,2.8vw,2.7rem)]`}
              >
                Make Room
                <br />
                for More Green
              </h2>
              <p
                className="m-0 mt-3 lg:mt-[1.1vw] max-w-[22em] text-[0.9375rem] lg:text-[clamp(0.8rem,1.05vw,0.9375rem)]
                           leading-relaxed text-[#f7f3e8]/85"
              >
                Premium pots, rich soil, and all you need to help your plants thrive.
              </p>
              <Link
                href="/gardening"
                className="group mt-6 lg:mt-[1.6vw] inline-flex items-center gap-2 h-11 lg:h-[clamp(2.4rem,3vw,2.75rem)] px-5
                           rounded-lg bg-[#faf8f2] text-[#1f3d24] text-[0.875rem] lg:text-[clamp(0.8rem,1vw,0.9375rem)]
                           font-semibold no-underline whitespace-nowrap shadow-[0_4px_14px_rgba(0,0,0,0.15)]
                           transition-colors duration-200 hover:bg-white
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f3e8]"
              >
                Shop Gardening Essentials
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * HeroSection — homepage banner.
 *
 * Server Component: the entrance animation is pure CSS (`animate-fade-up`,
 * defined in globals.css), so the heading renders without waiting for JS.
 *
 * Layout:
 *   md and up — photo fills the banner; copy sits on the cream left side
 *               with botanical leaves drawn along the left edge.
 *   below md  — stacked: copy on cream first, then the photo cropped
 *               towards the plants and products.
 */

import Image from "next/image";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import BotanicalSprig from "@/components/ui/BotanicalSprig";

/* ─── Botanical artwork ─────────────────────────────────────────── */
/* Two watercolour sprigs hugging the left edge (md+): one hanging from the
   top-left corner, one rising from the bottom-left. Both are mostly
   off-edge so only the leaves show, clear of the copy. */
function LeafBorder() {
  return (
    <div
      className="hidden md:block absolute inset-y-0 left-0 w-[clamp(5.5rem,8.3vw,9rem)] overflow-hidden pointer-events-none z-[1]
                 [mask-image:linear-gradient(to_right,black_75%,transparent)]"
    >
      <BotanicalSprig className="-left-[70%] -top-[4%] h-[66%] opacity-85" flip rotate={160} sizes="320px" />
      <BotanicalSprig className="-left-[55%] -bottom-[6%] h-[58%] opacity-85" rotate={-14} sizes="320px" />
    </div>
  );
}

/* Small sprig in the top-right corner of the mobile copy area. */
function MobileSprig() {
  return (
    <BotanicalSprig
      className="md:hidden -right-6 -top-4 h-36 opacity-60"
      flip
      rotate={150}
      sizes="320px"
    />
  );
}

/* ─── Arrow icon for CTA ─────────────────────────────────────────── */
function ArrowRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="transition-transform duration-200 group-hover:translate-x-1"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function HeroSection() {
  return (
    <section
      id="hero"
      aria-label="Welcome to Soil & Soul"
      className="relative flex flex-col md:block overflow-hidden bg-[#f4efe4]
                 md:h-[clamp(400px,33.5vw,600px)]"
    >
      {/* ── Photo ── */}
      <div className="relative order-2 aspect-[5/4] sm:aspect-[16/9] md:aspect-auto md:absolute md:inset-0">
        <Image
          src="/images/hero/soil-soul-hero.png"
          alt="Soil & Soul products — live plants, organic potting soil, aloe vera gel and neem face wash on a wooden table"
          fill
          priority
          sizes="(min-width: 768px) 100vw, 170vw"
          className="object-cover object-[74%_center] sm:object-[70%_center] md:object-[center_60%]"
        />
        {/* Mobile: blend the photo's top edge into the cream copy area */}
        <div className="md:hidden absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#f4efe4] to-transparent" />
        {/* Desktop: soften the left side behind the copy (stronger on narrow laptops) */}
        {/* Tablet: copy covers about half the photo, so fade more of it */}
        <div className="hidden md:block lg:hidden absolute inset-0 bg-gradient-to-r from-[#f4efe4]/95 via-[#f4efe4]/80 via-45% to-transparent to-75%" />
        <div className="hidden lg:block xl:hidden absolute inset-0 bg-gradient-to-r from-[#f4efe4]/70 via-[#f4efe4]/40 via-40% to-transparent to-55%" />
        <div
          className="hidden md:block absolute inset-0
                     bg-gradient-to-r from-[#f4efe4]/80 via-[#f4efe4]/30 via-35% to-transparent to-55%"
        />
      </div>

      <LeafBorder />

      {/* ── Copy ── */}
      <div
        className="relative z-[2] order-1 w-full max-w-[1536px] mx-auto
                   px-5 sm:px-8 md:px-0 pt-10 pb-8 sm:pt-14 sm:pb-10 md:py-0 md:h-full
                   flex items-center"
      >
        <MobileSprig />

        <div className="relative max-w-[540px] md:max-w-none md:pl-[clamp(5.5rem,8.3vw,9rem)] motion-safe:animate-fade-up">
          <p className="m-0 text-[0.6875rem] sm:text-xs md:text-[clamp(0.68rem,0.83vw,0.8rem)] font-medium tracking-[0.2em] uppercase text-[#6d7f60]">
            Plants<span className="mx-2 sm:mx-2.5">·</span>Gardening<span className="mx-2 sm:mx-2.5">·</span>Natural Care
          </p>

          <h1
            className={`${brandSerif.className} mt-3 sm:mt-4 md:mt-[0.9vw] mb-0 font-bold tracking-[-0.01em] text-[#1f3d24]
                        text-[2.35rem] leading-[1.1] sm:text-[3rem] md:text-[clamp(2.3rem,3.6vw,3.6rem)]`}
          >
            Bring Nature
            <br />
            Closer to You
          </h1>

          <p
            className="mt-4 sm:mt-5 md:mt-[1.2vw] mb-0 max-w-[25rem] md:max-w-[22.5em] text-[0.975rem] sm:text-base md:text-[clamp(0.9rem,1.17vw,1.0625rem)]
                       leading-relaxed text-[#38422f]"
          >
            Live plants, gardening essentials and plant‑based natural products for a
            healthier home and a greener tomorrow.
          </p>

          <div className="mt-7 md:mt-[2vw] grid grid-cols-2 gap-3 sm:flex sm:gap-5 md:gap-[1.4vw]">
            <Link
              href="/shop"
              id="hero-shop-all"
              className="group inline-flex items-center justify-center gap-2 h-12 px-5 sm:px-8 md:h-[clamp(2.6rem,3.3vw,3rem)] md:px-[clamp(1.4rem,2.2vw,2rem)] rounded-lg
                         bg-[#24452a] text-[#f4f1e8] text-[0.9375rem] md:text-[clamp(0.85rem,1.05vw,0.9375rem)] font-medium no-underline whitespace-nowrap
                         shadow-[0_4px_14px_rgba(36,69,42,0.18)] transition-colors duration-200 hover:bg-[#1b3520]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
            >
              Shop All
              <ArrowRight />
            </Link>
            <Link
              href="/plants"
              id="hero-explore-plants"
              className="inline-flex items-center justify-center h-12 px-5 sm:px-8 md:h-[clamp(2.6rem,3.3vw,3rem)] md:px-[clamp(1.4rem,2.2vw,2rem)] rounded-lg
                         border border-[#24452a]/70 bg-white/60 text-[#1f3d24] text-[0.9375rem] md:text-[clamp(0.85rem,1.05vw,0.9375rem)] font-medium
                         no-underline whitespace-nowrap transition-colors duration-200
                         hover:bg-[#24452a] hover:text-[#f4f1e8] hover:border-[#24452a]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
            >
              Explore Plants
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

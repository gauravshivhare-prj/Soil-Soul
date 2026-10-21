/**
 * HeroSection — homepage banner.
 *
 * Server Component: the entrance animation is pure CSS (`animate-fade-up`,
 * defined in globals.css), so the heading renders without waiting for JS.
 *
 * Layout:
 *   lg and up — photo fills the banner; copy sits on the cream left side
 *               with botanical leaves drawn along the left edge.
 *   below lg  — stacked: copy on cream first, then the photo cropped
 *               towards the plants and products.
 */

import Image from "next/image";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";

/* ─── Botanical leaf artwork ────────────────────────────────────── */
/*
 * One leaf, base at (0,0), tip pointing up (-y), ~66 units long.
 * Slightly asymmetric with a curved tip so repeated leaves look natural.
 * `fill` is a gradient url defined in the parent <svg>.
 */
function Leaf({ x, y, rotate, scale = 1, fill }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      {/* Petiole */}
      <path d="M0 6V0" stroke="#9cb38b" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M0 0C-14-6-22-26-14-44C-9-54-2-60 4-66C6-56 14-46 16-32C18-16 10-4 0 0Z"
        fill={fill}
        stroke="#9cb38b"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M0-1C2-20 2-40 4-63
           M1-12C-4-16-9-20-12-26 M1-12C6-15 10-18 13-22
           M2-26C-3-31-8-36-12-42 M2-26C7-29 11-33 15-36
           M3-40C-1-45-4-50-7-54 M3-40C7-43 10-47 12-50"
        stroke="#a9bd99"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </g>
  );
}

function LeafGradient({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="-66" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#c6d6b3" />
        <stop offset="1" stopColor="#e6eddb" />
      </linearGradient>
    </defs>
  );
}

/* Vine hanging down the left edge: leaves alternate right (visible) and
   left (partly cut off by the edge), like the reference artwork. */
const VINE_LEAVES = [
  { x: 8, y: 22, rotate: -55, scale: 1.44 },
  { x: 14, y: 58, rotate: 105, scale: 1.56 },
  { x: 16, y: 112, rotate: -78, scale: 1.38 },
  { x: 12, y: 152, rotate: 80, scale: 1.62 },
  { x: 11, y: 206, rotate: -95, scale: 1.44 },
  { x: 16, y: 246, rotate: 112, scale: 1.56 },
  { x: 20, y: 300, rotate: -70, scale: 1.32 },
  { x: 18, y: 340, rotate: 76, scale: 1.5 },
  { x: 15, y: 394, rotate: -100, scale: 1.26 },
  { x: 15, y: 430, rotate: 100, scale: 1.2 },
];

/* Branch rising diagonally from the bottom-left corner. */
const BRANCH_LEAVES = [
  { x: 10, y: 590, rotate: -80, scale: 1.25 },
  { x: 28, y: 568, rotate: 10, scale: 1.2 },
  { x: 46, y: 546, rotate: -72, scale: 1.1 },
  { x: 64, y: 524, rotate: 18, scale: 1 },
  { x: 86, y: 500, rotate: 35, scale: 0.9 },
];

function LeafBorder() {
  return (
    <svg
      className="hidden lg:block absolute left-0 top-0 h-full w-auto pointer-events-none z-[1]"
      viewBox="0 0 170 600"
      preserveAspectRatio="xMinYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <LeafGradient id="hero-leaf-fill" />
      <path d="M4-10C20 80 8 160 16 250S24 380 14 440" stroke="#9cb38b" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M-10 612C25 578 55 540 88 498" stroke="#9cb38b" strokeWidth="1.3" strokeLinecap="round" />
      {[...VINE_LEAVES, ...BRANCH_LEAVES].map((leaf) => (
        <Leaf key={`${leaf.x}-${leaf.y}`} {...leaf} fill="url(#hero-leaf-fill)" />
      ))}
    </svg>
  );
}

/* Small sprig for the top-right corner of the mobile copy area. */
function MobileSprig() {
  return (
    <svg
      className="lg:hidden absolute -right-4 top-0 w-28 h-28 pointer-events-none opacity-80"
      viewBox="0 0 130 130"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <LeafGradient id="hero-sprig-fill" />
      <path d="M140 -6C115 30 95 60 74 100" stroke="#9cb38b" strokeWidth="1.3" strokeLinecap="round" />
      <Leaf x={122} y={14} rotate={-140} scale={0.8} fill="url(#hero-sprig-fill)" />
      <Leaf x={108} y={40} rotate={-50} scale={0.75} fill="url(#hero-sprig-fill)" />
      <Leaf x={95} y={64} rotate={-150} scale={0.7} fill="url(#hero-sprig-fill)" />
      <Leaf x={82} y={86} rotate={-60} scale={0.6} fill="url(#hero-sprig-fill)" />
    </svg>
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
      className="relative flex flex-col lg:block overflow-hidden bg-[#f4efe4]
                 lg:h-[clamp(400px,37vw,640px)]"
    >
      {/* ── Photo ── */}
      <div className="relative order-2 aspect-[5/4] sm:aspect-[16/9] lg:aspect-auto lg:absolute lg:inset-0">
        <Image
          src="/images/hero/soil-soul-hero.png"
          alt="Soil & Soul products — live plants, organic potting soil, aloe vera gel and neem face wash on a wooden table"
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover object-[74%_center] sm:object-[70%_center] lg:object-[center_60%]"
        />
        {/* Mobile: blend the photo's top edge into the cream copy area */}
        <div className="lg:hidden absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#f4efe4] to-transparent" />
        {/* Desktop: soften the left side behind the copy (stronger on narrow laptops) */}
        <div className="hidden lg:block xl:hidden absolute inset-0 bg-gradient-to-r from-[#f4efe4]/70 via-[#f4efe4]/40 via-40% to-transparent to-55%" />
        <div
          className="hidden lg:block absolute inset-0
                     bg-gradient-to-r from-[#f4efe4]/80 via-[#f4efe4]/30 via-35% to-transparent to-55%"
        />
      </div>

      <LeafBorder />

      {/* ── Copy ── */}
      <div
        className="relative z-[2] order-1 w-full max-w-[1536px] mx-auto
                   px-5 sm:px-8 lg:px-0 pt-10 pb-8 sm:pt-14 sm:pb-10 lg:py-0 lg:h-full
                   flex items-center"
      >
        <MobileSprig />

        <div className="relative max-w-[540px] lg:max-w-none lg:pl-[clamp(5.5rem,8.3vw,9rem)] motion-safe:animate-fade-up">
          <p className="m-0 text-[0.6875rem] sm:text-xs lg:text-[clamp(0.68rem,0.83vw,0.8rem)] font-medium tracking-[0.2em] uppercase text-[#6d7f60]">
            Plants<span className="mx-2 sm:mx-2.5">·</span>Gardening<span className="mx-2 sm:mx-2.5">·</span>Natural Care
          </p>

          <h1
            className={`${brandSerif.className} mt-3 sm:mt-4 lg:mt-[0.9vw] mb-0 font-bold tracking-[-0.01em] text-[#1f3d24]
                        text-[2.35rem] leading-[1.1] sm:text-[3rem] lg:text-[clamp(2.4rem,3.9vw,4rem)]`}
          >
            Bring Nature
            <br />
            Closer to You
          </h1>

          <p
            className="mt-4 sm:mt-5 lg:mt-[1.2vw] mb-0 max-w-[25rem] lg:max-w-[22.5em] text-[0.975rem] sm:text-base lg:text-[clamp(0.9rem,1.17vw,1.0625rem)]
                       leading-relaxed text-[#38422f]"
          >
            Live plants, gardening essentials and plant‑based natural products for a
            healthier home and a greener tomorrow.
          </p>

          <div className="mt-7 lg:mt-[2vw] grid grid-cols-2 gap-3 sm:flex sm:gap-5 lg:gap-[1.4vw]">
            <Link
              href="/shop"
              id="hero-shop-all"
              className="group inline-flex items-center justify-center gap-2 h-12 px-5 sm:px-8 lg:h-[clamp(2.6rem,3.3vw,3rem)] lg:px-[clamp(1.4rem,2.2vw,2rem)] rounded-lg
                         bg-[#24452a] text-[#f4f1e8] text-[0.9375rem] lg:text-[clamp(0.85rem,1.05vw,0.9375rem)] font-medium no-underline whitespace-nowrap
                         shadow-[0_4px_14px_rgba(36,69,42,0.18)] transition-colors duration-200 hover:bg-[#1b3520]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24452a]"
            >
              Shop All
              <ArrowRight />
            </Link>
            <Link
              href="/plants"
              id="hero-explore-plants"
              className="inline-flex items-center justify-center h-12 px-5 sm:px-8 lg:h-[clamp(2.6rem,3.3vw,3rem)] lg:px-[clamp(1.4rem,2.2vw,2rem)] rounded-lg
                         border border-[#24452a]/70 bg-white/60 text-[#1f3d24] text-[0.9375rem] lg:text-[clamp(0.85rem,1.05vw,0.9375rem)] font-medium
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

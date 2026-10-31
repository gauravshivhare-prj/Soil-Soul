"use client";

/**
 * Navbar component for Soil & Soul.
 *
 * Server Component. The mobile drawer lives in the MobileNav client
 * component; dropdown menus and real cart count are deferred.
 *
 * Styling uses Tailwind utility classes (v4, Turbopack path) to avoid the
 * CSS-module injection issue observed with Server Components in dev mode.
 *
 * Structure:
 *   Announcement bar — dark green strip with shipping message (scrolls away).
 *   Main bar (sticky) — cream background:
 *     Left   — Brand: leaf mark, serif "Soil & Soul" wordmark, tagline.
 *     Centre — Primary navigation (DesktopNav client component: active underline).
 *     Right  — Search pill, Wishlist icon, Cart icon + badge, Account icon.
 *
 * Mobile (< lg): hamburger + brand on the left; search + cart on the right.
 * Wishlist and Account move into the drawer below `sm`.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brandSerif } from "@/app/fonts";
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import CartLink from "./CartLink";


/* ─── Navigation link definitions ─────────────────────────────────── */
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Plants", href: "/shop/plants" },
  { label: "Tools", href: "/shop/tools" },
  { label: "Seeds", href: "/shop/seeds" },
  { label: "Natural Products", href: "/shop/natural-products" },
  { label: "Our Story", href: "/our-story" },
];

/* ─── Inline SVG icons ──────────────────────────────────────────── */
/* Explicit width + height HTML attributes prevent SVG from defaulting to
   300 × 150 px when CSS has not yet been applied. */

function LeafMark() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Stem */}
      <path d="M7 45C10.5 40 13 35.5 16 30" stroke="#24452a" strokeWidth="2.2" strokeLinecap="round" />
      {/* Large leaf */}
      <path d="M16 30C13.5 18 22 7 43 4C42 18 33 29.5 16 30Z" fill="#24452a" />
      <path d="M17.5 28.5C24 21 31.5 13 39.5 7.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
      {/* Small leaf */}
      <path d="M14 34C7 33.5 2.5 27 2.5 17.5C10.5 18.5 15.5 25 14 34Z" fill="#24452a" />
      <path d="M13.5 32C10.5 28 7.5 24 4.5 20" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="21" y1="21" x2="15.8" y2="15.8" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.6l2.7 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.95-1.55L21.5 8H5.9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function Navbar() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  const iconBtnClass =
    "relative items-center justify-center w-10 h-10 xl:w-11 xl:h-11 rounded-full flex-shrink-0 " +
    "text-[#1f241d] no-underline bg-transparent transition-colors duration-150 " +
    "hover:text-[#24452a] hover:bg-[#ece8dc] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24452a]";

  return (
    <>
      {/* ── Announcement bar ── */}
      <div className="bg-[#24452a] text-[#f4f1e8] font-sans">
        <p className="max-w-[1360px] mx-auto px-4 h-8 sm:h-9 m-0 flex items-center justify-center gap-2 text-xs sm:text-[0.8125rem] tracking-wide text-center">
          <span aria-hidden="true">🌿</span>
          <span>Bring nature home</span>
          <span aria-hidden="true">🌱</span>
        </p>
      </div>

      <header
        role="banner"
        className="sticky top-0 z-50 bg-[#faf8f2] border-b border-[#ebe6da] font-sans"
      >
        <nav aria-label="Main navigation">
          <div className="max-w-[1536px] mx-auto px-4 sm:px-6 xl:px-10 h-16 sm:h-[72px] xl:h-[84px] flex items-center gap-2 sm:gap-4 xl:gap-5">

            {/* ── Mobile menu (hamburger + drawer, < lg only) ── */}
            <MobileNav links={NAV_LINKS} brandFontClass={brandSerif.className} />

            {/* ── Brand ── */}
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink no-underline"
              aria-label="Soil & Soul — home"
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 xl:w-[42px] xl:h-[42px] [&>svg]:w-full [&>svg]:h-full flex-shrink-0">
                <LeafMark />
              </span>
              <div className="flex flex-col leading-none">
                <span
                  className={`${brandSerif.className} text-[1.3rem] sm:text-[1.45rem] whitespace-nowrap xl:text-[1.7rem] font-semibold tracking-[-0.01em] text-[#1b2a1c] leading-none`}
                >
                  Soil &amp; Soul
                </span>
                <span
                  className="hidden sm:block text-[0.5rem] xl:text-[0.55rem] font-semibold tracking-[0.12em] xl:tracking-[0.14em] uppercase mt-1.5 text-[#1b2a1c]"
                  aria-hidden="true"
                >
                  Plants · Soil · Gardening
                </span>
              </div>
            </Link>

            {/* ── Primary navigation (lg+) ── */}
            <DesktopNav links={NAV_LINKS} />

            {/* ── Right-side actions ── */}
            <div
              className="flex items-center gap-0.5 sm:gap-1 xl:gap-2 flex-shrink-0 ml-auto -mr-2 sm:mr-0"
              role="group"
              aria-label="Site actions"
            >

              {/* Search pill */}
              <form
                className="hidden xl:flex items-center gap-2.5 bg-[#f0eee7] border border-transparent rounded-full
                           px-4 h-11 mr-1 2xl:mr-3
                           transition-all duration-150
                           focus-within:border-[#24452a] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(36,69,42,0.14)]"
                role="search"
                aria-label="Search products"
                action="/shop"
                method="get"
              >
                <span className="text-[#6b6a62] flex-shrink-0">
                  <SearchIcon />
                </span>
                <input
                  id="navbar-search"
                  type="search"
                  name="q"
                  placeholder="Search plants, pots, soil…"
                  aria-label="Search for plants, pots, soil…"
                  autoComplete="off"
                  className="border-0 outline-none bg-transparent text-[0.875rem] text-[#1f241d]
                             placeholder:text-[#8f8c82] w-44 2xl:w-52 min-w-0"
                />
              </form>

              {/* Search icon — replaces the pill below xl */}
              <Link href="/shop" className={`${iconBtnClass} inline-flex xl:hidden`} aria-label="Search">
                <span className="[&>svg]:w-[22px] [&>svg]:h-[22px]">
                  <SearchIcon />
                </span>
              </Link>

              {/* Wishlist */}
              <Link href="/account/wishlist" className={`${iconBtnClass} hidden sm:inline-flex`} aria-label="Wishlist">
                <HeartIcon />
              </Link>

              {/* Cart */}
              <CartLink className={`${iconBtnClass} inline-flex`}>
                <CartIcon />
              </CartLink>

              {/* Account */}
              <Link href="/account" className={`${iconBtnClass} hidden sm:inline-flex`} aria-label="My account">
                <UserIcon />
              </Link>

            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

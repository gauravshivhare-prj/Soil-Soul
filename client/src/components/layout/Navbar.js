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
 *     Centre — Primary navigation; chevrons mark future dropdown menus.
 *     Right  — Search pill, Wishlist icon, Cart icon + badge, Account icon.
 *
 * Mobile (< lg): hamburger + brand on the left; search + cart on the right.
 * Wishlist and Account move into the drawer below `sm`.
 */

import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import MobileNav from "./MobileNav";

const brandSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/* ─── Navigation link definitions ─────────────────────────────────── */
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop", hasMenu: true },
  { label: "Plants", href: "/plants", hasMenu: true },
  { label: "Gardening", href: "/gardening", hasMenu: true },
  { label: "Natural Care", href: "/natural-care", hasMenu: true },
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
      {/* Leaf body */}
      <path
        d="M42 5C42 5 22 4 12.5 15C5 23.5 7 35 7 35C7 35 18.5 38.5 28 31C39 22.5 42 5 42 5Z"
        fill="#24452a"
      />
      {/* Stem + midrib */}
      <path
        d="M4 44C10 34 19 24 35 12"
        fill="none"
        stroke="#24452a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10.5 36C17 28 24 21 35 12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Side veins */}
      <g stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d="M17 29.5C17 25.5 16.5 22 15.5 19.5" />
        <path d="M22.5 24C23 20.5 22.5 17 21.5 14" />
        <path d="M28 19C29 16 29 13 28.5 10" />
        <path d="M17 29.5C21 30 24.5 29.5 27.5 28" />
        <path d="M22.5 24C26 24.5 29.5 23.5 32.5 21.5" />
        <path d="M28 19C31 19 34 17.5 36.5 15.5" />
      </g>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="6 9 12 15 18 9" />
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
  /**
   * cartCount will be wired to real state in a later phase.
   * Hardcoded 0 keeps the badge hidden and aria-label correct.
   */
  const cartCount = 0;

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
          <span>Free shipping on orders above ₹499</span>
          <span className="opacity-60" aria-hidden="true">|</span>
          <span className="hidden sm:inline">Bring nature home</span>
          <span className="hidden sm:inline" aria-hidden="true">🌱</span>
        </p>
      </div>

      <header
        role="banner"
        className="sticky top-0 z-50 bg-[#faf8f2] border-b border-[#ebe6da] font-sans"
      >
        <nav aria-label="Main navigation">
          <div className="max-w-[1536px] mx-auto px-4 sm:px-6 xl:px-10 h-16 sm:h-[72px] xl:h-[84px] flex items-center gap-2 sm:gap-4 xl:gap-6">

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
                  className={`${brandSerif.className} text-[1.45rem] sm:text-[1.6rem] whitespace-nowrap xl:text-[2rem] font-semibold text-[#1b2a1c] leading-none`}
                >
                  Soil &amp; Soul
                </span>
                <span
                  className="hidden sm:block text-[0.5rem] xl:text-[0.55rem] font-semibold tracking-[0.12em] xl:tracking-[0.14em] uppercase mt-1.5 text-[#1b2a1c]"
                  aria-hidden="true"
                >
                  Plants · Gardening · Natural Care
                </span>
              </div>
            </Link>

            {/* ── Primary navigation ── */}
            <ul
              className="hidden lg:flex items-center gap-0 xl:gap-1 list-none m-0 p-0 flex-1 min-w-0 justify-center"
              role="list"
            >
              {NAV_LINKS.map(({ label, href, hasMenu }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-1 text-sm xl:text-[0.9375rem] font-medium text-[#1f241d] no-underline px-2 xl:px-3 py-2 rounded-md whitespace-nowrap
                               transition-colors duration-150
                               hover:text-[#24452a] hover:bg-[#ece8dc]
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24452a] focus-visible:outline-offset-2"
                  >
                    {label}
                    {hasMenu && <ChevronDownIcon />}
                  </Link>
                </li>
              ))}
            </ul>

            {/* ── Right-side actions ── */}
            <div
              className="flex items-center gap-0.5 sm:gap-1 xl:gap-2 flex-shrink-0 ml-auto -mr-2 sm:mr-0"
              role="group"
              aria-label="Site actions"
            >

              {/* Search pill */}
              <form
                className="hidden 2xl:flex items-center gap-2.5 bg-[#efece4] border border-transparent rounded-full
                           px-4 h-11 mr-2
                           transition-all duration-150
                           focus-within:border-[#24452a] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(36,69,42,0.14)]"
                role="search"
                aria-label="Search products"
                action="/search"
                method="get"
              >
                <span className="text-[#6b6a62] flex-shrink-0">
                  <SearchIcon />
                </span>
                <input
                  id="navbar-search"
                  type="search"
                  name="q"
                  placeholder="Search for plants, pots, soil…"
                  aria-label="Search for plants, pots, soil…"
                  autoComplete="off"
                  className="border-0 outline-none bg-transparent text-[0.875rem] text-[#1f241d]
                             placeholder:text-[#8f8c82] w-48 min-w-0"
                />
              </form>

              {/* Search icon — replaces the pill below 2xl */}
              <Link href="/search" className={`${iconBtnClass} inline-flex 2xl:hidden`} aria-label="Search">
                <span className="[&>svg]:w-[22px] [&>svg]:h-[22px]">
                  <SearchIcon />
                </span>
              </Link>

              {/* Wishlist */}
              <Link href="/wishlist" className={`${iconBtnClass} hidden sm:inline-flex`} aria-label="Wishlist">
                <HeartIcon />
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className={`${iconBtnClass} inline-flex`}
                aria-label={
                  cartCount > 0
                    ? `Cart — ${cartCount} ${cartCount === 1 ? "item" : "items"}`
                    : "Cart — empty"
                }
              >
                <CartIcon />
                {cartCount > 0 && (
                  <span
                    className="absolute top-0.5 right-0 min-w-[1.15rem] h-[1.15rem] px-1
                               rounded-full bg-[#24452a] text-white
                               text-[0.65rem] font-bold leading-none
                               flex items-center justify-center pointer-events-none"
                    aria-hidden="true"
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

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

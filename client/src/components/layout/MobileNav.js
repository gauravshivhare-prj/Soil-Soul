"use client";

/**
 * MobileNav — hamburger button + slide-in drawer for screens below `lg`.
 *
 * Client Component (needs open/close state). Rendered inside the server
 * Navbar, which passes plain data (links, font class) as props.
 *
 * Behaviour:
 *   - Closes on backdrop tap, Escape key, close button, or route change.
 *   - Locks page scroll while open.
 *   - Moves focus into the drawer on open and back to the button on close.
 *   - Drawer is `inert` while closed so hidden links are not tabbable.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECONDARY_LINKS = [
  { label: "My Account", href: "/account", icon: "user" },
  { label: "Wishlist", href: "/account/wishlist", icon: "heart" },
  { label: "Cart", href: "/cart", icon: "cart" },
];

/* ─── Icons ─────────────────────────────────────────────────────── */
function Svg({ size = 24, strokeWidth = 1.75, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function MenuIcon() {
  return (
    <Svg strokeWidth={2}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="14" y2="17" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg strokeWidth={2}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg size={18} strokeWidth={2}>
      <polyline points="9 6 15 12 9 18" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg size={18} strokeWidth={2}>
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="21" y1="21" x2="15.8" y2="15.8" />
    </Svg>
  );
}

const SECONDARY_ICONS = {
  user: (
    <Svg size={20}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  ),
  heart: (
    <Svg size={20}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </Svg>
  ),
  cart: (
    <Svg size={20}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.6l2.7 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 1.95-1.55L21.5 8H5.9" />
    </Svg>
  ),
};

/* ─── Component ─────────────────────────────────────────────────── */
export default function MobileNav({ links, brandFontClass }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef(null);
  const closeRef = useRef(null);
  const wasOpen = useRef(false);

  // Close whenever the route changes (e.g. after tapping a link).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Escape key, scroll lock, and focus management.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();

      const onKey = (e) => {
        if (e.key === "Escape") setOpen(false);
      };
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", onKey);
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      buttonRef.current?.focus();
    }
  }, [open]);

  // Close if the viewport grows to desktop size while open.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => e.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {/* Hamburger */}
      <button
        ref={buttonRef}
        type="button"
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-full flex-shrink-0
                   text-[#1f241d] bg-transparent border-0 cursor-pointer
                   transition-colors duration-150 hover:bg-[#ece8dc]
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24452a]"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300
                    ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!open}
        className={`lg:hidden fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-[360px]
                    flex flex-col bg-[#faf8f2] shadow-2xl font-sans
                    transition-[transform,visibility] duration-300 ease-out
                    ${open ? "translate-x-0 visible" : "-translate-x-full invisible"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-[#ebe6da] flex-shrink-0">
          <span className={`${brandFontClass} text-[1.4rem] font-semibold text-[#1b2a1c] leading-none`}>
            Soil &amp; Soul
          </span>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-full
                       text-[#1f241d] bg-transparent border-0 cursor-pointer
                       hover:bg-[#ece8dc]
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24452a]"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Search */}
          <form
            className="mx-5 mt-5 flex items-center gap-2.5 bg-[#efece4] border border-transparent rounded-full px-4 h-12
                       focus-within:border-[#24452a] focus-within:bg-white"
            role="search"
            aria-label="Search products"
            action="/shop"
            method="get"
          >
            <span className="text-[#6b6a62] flex-shrink-0">
              <SearchIcon />
            </span>
            <input
              type="search"
              name="q"
              placeholder="Search for plants, pots, soil…"
              aria-label="Search for plants, pots, soil…"
              autoComplete="off"
              // 16px font prevents iOS Safari from zooming in on focus.
              className="flex-1 min-w-0 border-0 outline-none bg-transparent text-base text-[#1f241d] placeholder:text-[#8f8c82]"
            />
          </form>

          {/* Primary links */}
          <nav aria-label="Mobile navigation" className="mt-3">
            <ul className="list-none m-0 p-0" role="list">
              {links.map(({ label, href }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between px-5 py-3.5 text-[1.0625rem] font-medium no-underline
                                  border-b border-[#efebe1] transition-colors duration-150
                                  hover:bg-[#ece8dc] focus-visible:bg-[#ece8dc] focus-visible:outline-none
                                  ${active ? "text-[#24452a]" : "text-[#1f241d]"}`}
                    >
                      {label}
                      <span className="text-[#8f8c82]">
                        <ChevronRightIcon />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Account shortcuts */}
          <ul className="list-none m-0 px-5 pt-5 pb-6 grid gap-1" role="list">
            {SECONDARY_LINKS.map(({ label, href, icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2.5 text-[0.9375rem] text-[#3d4239] no-underline
                             hover:text-[#24452a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24452a] rounded"
                >
                  {SECONDARY_ICONS[icon]}
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Drawer footer */}
        <p className="m-0 px-5 py-3 text-xs text-center text-[#f4f1e8] bg-[#24452a] flex-shrink-0">
          🌿 Free shipping on orders above ₹499
        </p>
      </div>
    </>
  );
}

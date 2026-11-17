"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { productHref } from "@/lib/routes";

function SearchIcon({ size = 18 }) {
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
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="21" y1="21" x2="15.8" y2="15.8" />
    </svg>
  );
}

function CloseIcon({ size = 18 }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const QUICK_SEARCHES = ["Beginner Plants", "Living Soil", "Gardening Tools", "Flower Seeds", "Cocopeat"];

export default function NavbarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);
  const mobileInputRef = useRef(null);

  // Debounced live search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiRequest(`/products?search=${encodeURIComponent(trimmed)}&limit=5`);
        if (res && res.products) {
          setResults(res.products);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setIsOpenMobile(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus mobile input on open
  useEffect(() => {
    if (isOpenMobile) {
      mobileInputRef.current?.focus();
    }
  }, [isOpenMobile]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    setIsOpenMobile(false);
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSelectQuick = (tag) => {
    setQuery(tag);
    setShowDropdown(false);
    setIsOpenMobile(false);
    router.push(`/shop?q=${encodeURIComponent(tag)}`);
  };

  return (
    <>
      {/* ─── Desktop Search Pill (xl+) ───────────────────────────── */}
      <div ref={containerRef} className="relative hidden xl:block">
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Search products"
          className="flex items-center gap-2.5 bg-[#f0eee7] border border-transparent rounded-full
                     px-4 h-11 mr-1 2xl:mr-3 transition-all duration-150
                     focus-within:border-[#24452a] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(36,69,42,0.14)]"
        >
          <span className="text-[#6b6a62] flex-shrink-0">
            <SearchIcon size={17} />
          </span>
          <input
            id="navbar-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search plants, soil, tools…"
            aria-label="Search for plants, soil, tools"
            autoComplete="off"
            className="border-0 outline-none bg-transparent text-[0.875rem] text-[#1f241d]
                       placeholder:text-[#8f8c82] w-48 2xl:w-56 min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="text-muted hover:text-ink cursor-pointer bg-transparent border-0 p-0"
              aria-label="Clear search"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </form>

        {/* Live Search Autocomplete Dropdown */}
        {showDropdown && query.trim().length >= 2 && (
          <div className="absolute top-12 left-0 w-80 2xl:w-96 rounded-2xl bg-white border border-line shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3.5 py-1 text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
              <span>Matching Products</span>
              {isSearching && <span className="text-forest animate-pulse">Searching…</span>}
            </div>

            {results.length > 0 ? (
              <ul className="list-none m-0 p-0 divide-y divide-line/60">
                {results.map((p) => (
                  <li key={p.id || p.slug}>
                    <Link
                      href={productHref(p.slug)}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-sand/40 no-underline text-ink transition-colors"
                    >
                      <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-sand/30 shrink-0">
                        {p.image?.src ? (
                          <Image src={p.image.src} alt={p.name} fill sizes="44px" className="object-cover" />
                        ) : (
                          <div className="h-full w-full bg-sage-50 flex items-center justify-center text-xs">🌿</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="m-0 text-xs font-semibold text-ink truncate">{p.name}</p>
                        <p className="m-0 text-[11px] text-muted truncate">{p.category?.name || "Botanical"}</p>
                      </div>
                      <span className="text-xs font-bold text-forest shrink-0">₹{p.price}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              !isSearching && (
                <div className="px-4 py-4 text-center text-xs text-muted">
                  No botanicals found matching &ldquo;{query}&rdquo;
                </div>
              )
            )}

            <div className="border-t border-line mt-1 px-3.5 pt-2 pb-1">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-1.5 px-3 rounded-lg bg-forest text-cream text-xs font-medium hover:bg-forest-dark transition-colors cursor-pointer border-0"
              >
                View all results for &ldquo;{query}&rdquo; →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile/Tablet Search Button (< xl) ───────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpenMobile(true)}
        className="relative items-center justify-center w-10 h-10 xl:w-11 xl:h-11 rounded-full flex-shrink-0
                   text-[#1f241d] bg-transparent transition-colors duration-150
                   hover:text-[#24452a] hover:bg-[#ece8dc] inline-flex xl:hidden cursor-pointer border-0
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#24452a]"
        aria-label="Open search dialog"
      >
        <SearchIcon size={20} />
      </button>

      {/* ─── Mobile Fullscreen Search Overlay ─────────────────────── */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex flex-col justify-start p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-xl mx-auto rounded-3xl bg-[#faf8f2] border border-line shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header / Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3.5 border-b border-line bg-white">
              <span className="text-muted pl-1">
                <SearchIcon size={20} />
              </span>
              <input
                ref={mobileInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plants, living soil, seeds, tools…"
                className="flex-1 bg-transparent border-0 outline-none text-base text-ink placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-sand/60 text-ink hover:bg-sand cursor-pointer border-0"
                aria-label="Close search"
              >
                <CloseIcon size={18} />
              </button>
            </form>

            {/* Quick Searches */}
            <div className="p-4 border-b border-line/60 bg-cream">
              <p className="m-0 text-xs font-semibold text-muted mb-2">Popular Searches:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SEARCHES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectQuick(tag)}
                    className="px-2.5 py-1 rounded-full bg-white border border-line text-xs font-medium text-forest hover:bg-forest/10 hover:border-forest/40 transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {isSearching && (
                <div className="py-6 text-center text-sm text-forest font-medium animate-pulse">
                  Searching Soil &amp; Soul catalogue…
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-1">
                  <p className="m-0 text-xs font-semibold text-muted px-2 py-1">Products Found ({results.length}):</p>
                  {results.map((p) => (
                    <Link
                      key={p.id || p.slug}
                      href={productHref(p.slug)}
                      onClick={() => setIsOpenMobile(false)}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-line hover:border-forest/40 no-underline text-ink transition-all"
                    >
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-sand/30 shrink-0">
                        {p.image?.src ? (
                          <Image src={p.image.src} alt={p.name} fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="h-full w-full bg-sage-50 flex items-center justify-center text-xs">🌿</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="m-0 text-sm font-semibold text-ink truncate">{p.name}</p>
                        <p className="m-0 text-xs text-muted truncate">{p.category?.name || "Botanical"}</p>
                      </div>
                      <span className="text-sm font-bold text-forest shrink-0">₹{p.price}</span>
                    </Link>
                  ))}
                </div>
              )}

              {!isSearching && query.trim().length >= 2 && results.length === 0 && (
                <div className="py-8 text-center text-sm text-muted">
                  No botanicals found for &ldquo;{query}&rdquo;. Try another name or search all items.
                </div>
              )}
            </div>

            {/* Footer Submit */}
            {query.trim() && (
              <div className="p-3 border-t border-line bg-white">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full h-11 rounded-xl bg-forest text-cream font-medium text-sm flex items-center justify-center gap-2 hover:bg-forest-dark transition-colors cursor-pointer border-0"
                >
                  <SearchIcon size={16} /> Search for &ldquo;{query}&rdquo;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

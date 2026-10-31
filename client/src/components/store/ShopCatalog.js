"use client";

/**
 * ShopCatalog — search, filters, sorting, grid/list view and pagination over the live
 * catalogue. The API returns only the current result page after applying query controls.
 *
 * - `initialCategories` preselects categories (category/collection pages).
 * - A `?q=` search term in the URL (from the navbar search) seeds the search
 *   box; it's read via useSyncExternalStore so prerendered HTML and the
 *   first client render match.
 * - On small screens the filters open in a slide-over panel.
 */

import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { defaultOptionId, fetchCategories, fetchProductFacets, fetchProducts, isInStock, SHOP_SORT_OPTIONS as SORT_OPTIONS } from "@/services/catalogApi";
import { productHref } from "@/lib/routes";
import { useCart } from "@/features/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import ProductCard from "./ProductCard";
import ShopFilters from "./ShopFilters";
import WishlistButton from "./WishlistButton";
import Pagination from "@/components/ui/Pagination";
import ProductImage from "@/components/ui/ProductImage";
import Price from "@/components/ui/Price";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { EmptyState, FormMessage, ProductGridSkeleton } from "@/components/ui/States";

const PAGE_SIZE = 12;

/* Fetch only categories and server-computed facets; product rows remain paginated. */
function useCatalog() {
  const [state, setState] = useState({ status: "loading", categories: [], facets: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchCategories({ signal: controller.signal }), fetchProductFacets({ signal: controller.signal })])
      .then(([categories, facets]) => {
        const counts = new Map(facets.categories.map((item) => [item.id, item.count]));
        setState({ status: "ready", facets, error: null, categories: categories.map((c) => ({ ...c, productCount: counts.get(c.id ?? c._id) ?? 0 })) });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState((s) => ({ ...s, status: "error", error }));
      });
    return () => controller.abort();
  }, []);
  return state;
}

// Display names for the fixed light/size values (same wording as the admin product form).
const LIGHT_LABELS = { low: "Low light", "bright-indirect": "Bright indirect", "full-sun": "Full sun" };
const SIZE_LABELS = { small: "Small", medium: "Medium", large: "Large" };
const humanize = (value) => value.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* Distinct values present in the catalog as { id, label } options (ShopFilters keys and filters by id). */
function optionsOf(values, labels = {}) {
  return [...new Set(values.filter((v) => typeof v === "string" && v))]
    .sort()
    .map((id) => ({ id, label: labels[id] ?? humanize(id) }));
}

function filterOptionsFor(facets) {
  return {
    tags: optionsOf(facets.tags),
    lightLevels: optionsOf(facets.light, LIGHT_LABELS),
    sizes: optionsOf(facets.sizes, SIZE_LABELS),
    priceMin: facets.priceMin,
    priceMax: Math.max(100, Math.ceil(facets.priceMax / 100) * 100),
  };
}

/* ─── ?q= from the URL ─────────────────────────────────────────── */
function subscribeToLocation(callback) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
const readUrlQuery = () => new URLSearchParams(window.location.search).get("q") ?? "";
const serverUrlQuery = () => "";

function defaultFilters(options, categories) {
  return { categories, priceMin: options.priceMin, priceMax: options.priceMax, tags: [], light: [], sizes: [], inStockOnly: false };
}

function countActive(filters, options, initialCategories) {
  const sameCategories =
    filters.categories.length === initialCategories.length && filters.categories.every((c) => initialCategories.includes(c));
  return (
    (sameCategories ? 0 : 1) +
    (filters.priceMin !== options.priceMin || filters.priceMax !== options.priceMax ? 1 : 0) +
    filters.tags.length +
    filters.light.length +
    filters.sizes.length +
    (filters.inStockOnly ? 1 : 0)
  );
}

/* ─── List-view row ────────────────────────────────────────────── */
function ProductRow({ product }) {
  const { addItem } = useCart();
  const { notify } = useToast();
  const inStock = isInStock(product);
  return (
    <article className="flex gap-3 sm:gap-5 rounded-xl border border-line bg-white p-3 sm:p-4">
      <Link href={productHref(product.slug)} tabIndex={-1} aria-hidden="true" className="flex-shrink-0">
        <ProductImage image={product.image} className="w-24 h-24 sm:w-36 sm:h-36" rounded="rounded-lg" sizes="150px" />
      </Link>
      <div className="flex flex-1 min-w-0 flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <div className="flex-1 min-w-0">
          <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[0.6875rem] font-medium text-[#3d5a35]">{product.category.shortName}</span>
          <h3 className="m-0 mt-1.5 text-sm sm:text-base font-semibold text-ink">
            <Link href={productHref(product.slug)} className="text-inherit no-underline hover:text-forest">{product.name}</Link>
          </h3>
          <p className="m-0 mt-1 hidden sm:block text-sm text-muted line-clamp-2">{product.summary}</p>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-3">
          <Price price={product.price} mrp={product.mrp} size="md" />
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <WishlistButton product={product} className="border border-line !shadow-none" />
            <Button
              size="sm"
              disabled={!inStock}
              onClick={async () => {
                const result = await addItem(product, { optionId: defaultOptionId(product) });
                if (result.ok) notify(`${product.name} added to your cart`);
                else if (result.error) notify(result.error.message, { tone: "error" });
              }}
            >
              {inStock ? <><Icon name="cart" size={14} />Add to Cart</> : "Out of Stock"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── Mobile filter panel ──────────────────────────────────────── */
function FilterPanel({ isOpen, onClose, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-y-0 left-0 w-[86vw] max-w-[340px] flex flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between h-14 px-5 border-b border-line">
          <span className="text-base font-semibold text-ink">Filters</span>
          <button type="button" onClick={onClose} autoFocus className="w-9 h-9 -mr-2 inline-flex items-center justify-center rounded-full bg-transparent border-0 cursor-pointer text-ink hover:bg-sage-50" aria-label="Close filters">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
        <div className="p-4 border-t border-line">
          <Button block onClick={onClose}>Show results</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Catalog ──────────────────────────────────────────────────── */
export default function ShopCatalog({ initialCategories = [] }) {
  const catalog = useCatalog();
  if (catalog.status === "loading") {
    return <ProductGridSkeleton count={8} />;
  }
  if (catalog.status === "error") {
    return (
      <div className="max-w-xl space-y-3">
        <FormMessage tone="error">{catalog.error.message}</FormMessage>
        <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }
  return <CatalogBody initialCategories={initialCategories} categories={catalog.categories} facets={catalog.facets} />;
}

/* Product filtering, sorting and pagination are performed by the API. */
function CatalogBody({ initialCategories, categories, facets }) {
  const options = useMemo(() => filterOptionsFor(facets), [facets]);
  const urlQuery = useSyncExternalStore(subscribeToLocation, readUrlQuery, serverUrlQuery);
  const [typedQuery, setTypedQuery] = useState(null);
  const query = typedQuery ?? urlQuery;
  const [filters, setFilters] = useState(() => defaultFilters(options, initialCategories));
  const [sort, setSort] = useState("featured");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Keep typing responsive on slow devices: results catch up a frame later.
  const deferredFilters = useDeferredValue(filters);
  const deferredQuery = useDeferredValue(query);
  const deferredSort = useDeferredValue(sort);
  const isUpdating = deferredFilters !== filters || deferredQuery !== query || deferredSort !== sort;
  const params = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    ...(deferredQuery.trim() ? { search: deferredQuery } : {}),
    ...(deferredFilters.categories.length ? { category: deferredFilters.categories.join(",") } : {}),
    ...(deferredFilters.priceMin !== options.priceMin ? { priceMin: deferredFilters.priceMin } : {}),
    ...(deferredFilters.priceMax !== options.priceMax ? { priceMax: deferredFilters.priceMax } : {}),
    ...(deferredFilters.tags.length ? { tag: deferredFilters.tags.join(",") } : {}),
    ...(deferredFilters.light.length ? { light: deferredFilters.light.join(",") } : {}),
    ...(deferredFilters.sizes.length ? { size: deferredFilters.sizes.join(",") } : {}),
    ...(deferredFilters.inStockOnly ? { inStock: true } : {}),
    sort: deferredSort,
  }), [page, deferredQuery, deferredFilters, deferredSort, options]);
  const requestKey = JSON.stringify(params);
  const [result, setResult] = useState({ key: "", status: "loading", products: [], pagination: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => fetchProducts(params, { signal: controller.signal })
      .then(({ products, pagination }) => setResult({ key: requestKey, status: "ready", products, pagination, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, status: "error", products: [], pagination: null, error });
      }), 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [params, requestKey]);

  const current = result.key === requestKey ? result : { status: "loading", products: [], pagination: null, error: null };
  const products = current.products;
  const total = current.pagination?.total ?? 0;
  const totalPages = current.pagination?.totalPages ?? 1;
  const currentPage = page;
  const activeCount = countActive(filters, options, initialCategories);

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }
  function clearAll() {
    setFilters(defaultFilters(options, []));
    setTypedQuery("");
    setPage(1);
  }
  function goToPage(p) {
    setPage(p);
    document.getElementById("shop-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filterProps = { filters, onChange: updateFilters, onClear: clearAll, categories, options, activeCount };
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  if (current.status === "loading" && !current.pagination) return <ProductGridSkeleton count={8} />;
  if (current.status === "error") return <FormMessage tone="error">{current.error.message}</FormMessage>;

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr] xl:grid-cols-[270px_1fr] xl:gap-8">
      {/* Sidebar (desktop) */}
      <aside aria-label="Product filters" className="hidden lg:block">
        <div className="sticky top-28 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(36,69,42,0.05)]">
          <ShopFilters {...filterProps} />
        </div>
      </aside>

      <FilterPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}>
        <ShopFilters {...filterProps} />
      </FilterPanel>

      <section id="shop-results" aria-label="Products" className="min-w-0 scroll-mt-28">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="relative w-full md:max-w-xs">
            <label htmlFor="shop-search" className="sr-only">Search products</label>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="search" size={17} /></span>
            <input
              id="shop-search"
              type="search"
              maxLength={100}
              value={query}
              onChange={(e) => {
                setTypedQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search plants, pots, soil…"
              className="w-full h-10 rounded-full border border-line bg-white pl-10 pr-4 text-base sm:text-sm text-ink placeholder:text-faint outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border border-line bg-white text-sm text-ink cursor-pointer hover:border-forest/50"
            >
              <Icon name="filter" size={16} />
              Filters{activeCount > 0 && <span className="rounded-full bg-forest px-1.5 text-[0.6875rem] text-cream">{activeCount}</span>}
            </button>

            <label htmlFor="shop-sort" className="hidden sm:block text-sm text-muted whitespace-nowrap">Sort by</label>
            <div className="relative flex-1 md:flex-none">
              <select
                id="shop-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="w-full md:w-48 h-10 appearance-none rounded-lg border border-line bg-white pl-3 pr-9 text-sm text-ink cursor-pointer outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
              >
                {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="chevron-down" size={16} /></span>
            </div>

            <div role="group" aria-label="View" className="hidden sm:flex rounded-lg border border-line bg-white p-0.5">
              {[["grid", "Grid view"], ["list", "List view"]].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  aria-label={label}
                  className={`w-9 h-9 inline-flex items-center justify-center rounded-md border-0 cursor-pointer ${view === id ? "bg-forest text-cream" : "bg-transparent text-muted hover:text-forest"}`}
                >
                  <Icon name={id} size={17} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="m-0 mb-4 text-sm text-muted" aria-live="polite">
          {total > 0 ? (
            <>Showing <strong className="font-semibold text-ink">{from}–{to}</strong> of {total} products</>
          ) : (
            "No products match your filters"
          )}
        </p>

        {/* Results */}
        <div className={`transition-opacity duration-150 ${isUpdating ? "opacity-60" : "opacity-100"}`} aria-busy={isUpdating}>
          {facets.categories.length === 0 ? (
            <EmptyState icon="box" title="No products yet" description="New plants and essentials are on their way. Please check back soon." />
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white">
              <EmptyState
                icon="search"
                title="No matching products"
                description={query ? `We couldn't find anything for “${query}” with these filters.` : "Try removing a filter or widening the price range."}
                action={<Button variant="outline" onClick={clearAll}><Icon name="refresh" size={15} />Clear all filters</Button>}
              />
            </div>
          ) : view === "grid" ? (
            <ul role="list" className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} imageAspect="aspect-[25/22]" sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw" />
                </li>
              ))}
            </ul>
          ) : (
            <ul role="list" className="list-none m-0 p-0 grid gap-3">
              {products.map((p) => <li key={p.id}><ProductRow product={p} /></li>)}
            </ul>
          )}
        </div>

        <Pagination page={currentPage} totalPages={totalPages} onChange={goToPage} className="mt-8" />
      </section>
    </div>
  );
}

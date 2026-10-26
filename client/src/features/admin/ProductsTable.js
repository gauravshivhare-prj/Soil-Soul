"use client";

/**
 * ProductsTable — admin product list (GET /admin/products, any status) with server-side
 * search, category/status filters, sorting and paging, plus archive/restore.
 * Products are archived (hidden from the shop), never deleted.
 */

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { adminProductHref, productHref } from "@/lib/routes";
import Card from "@/components/ui/Card";
import Button, { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import ProductImage from "@/components/ui/ProductImage";
import { StatusBadge, stockStatus } from "@/components/ui/Badge";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/AdminParts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { availableStock } from "@/services/catalogApi";
import { runDeletion } from "./deletion";

const PAGE_SIZE = 25;
// Mirrors the storefront rule: visible only when active, status "active" and not archived.
const productStatus = (p) =>
  p.archivedAt ? "archived" : p.status === "draft" ? "draft" : p.isActive && p.status !== "inactive" ? "active" : "inactive";
/* Sellable stock: products with variants show the total across their available variants. */
function StockCell({ product }) {
  const total = availableStock(product);
  const variants = (product.options?.choices ?? []).filter((c) => c.isActive !== false);
  const soldOut = variants.filter((c) => availableStock(product, c.id) <= 0).length;
  return (
    <span className="block whitespace-nowrap">
      <span className="flex items-center gap-2">
        <span className="text-ink">{total}</span>
        <StatusBadge status={stockStatus(total, 5)} />
      </span>
      {variants.length > 0 && (
        <span className="block mt-0.5 text-xs text-muted">
          {variants.length} {variants.length === 1 ? "variant" : "variants"}
          {soldOut > 0 ? ` · ${soldOut} out of stock` : ""}
        </span>
      )}
    </span>
  );
}

const firstImage = (p) => (p.images?.[0]?.src ? { src: p.images[0].src, alt: p.images[0].alt || p.name } : null);

export default function ProductsTable() {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [imageFilter, setImageFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status, sort });
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (imageFilter) params.set("image", imageFilter);
  const list = useAuthedResource(`/admin/products?${params}`);
  const categories = useAuthedResource("/admin/categories?limit=100");
  const categoryName = new Map((categories.data?.categories ?? []).map((c) => [c.id, c.shortName || c.name]));

  const change = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  async function archiveOrRestore(p) {
    const action = p.archivedAt ? "restore" : "archive";
    if (action === "archive" && !window.confirm(`Archive “${p.name}”? It will be hidden from the shop until restored.`)) return;
    setBusyId(p.id);
    setActionError(null);
    try {
      await authRequest(`/admin/products/${p.id}/${action}`, { method: "POST" });
      notify(`${p.name} ${action === "archive" ? "archived" : "restored"}.`);
      list.reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Permanent delete: only for products without a usable image that no order references (the
  // server decides and explains); asks for confirmation first and sends the slug as confirmation.
  async function deleteProduct(p) {
    setBusyId(p.id);
    setActionError(null);
    try {
      const outcome = await runDeletion({
        label: p.name,
        loadCheck: () => authRequest(`/admin/products/${p.id}/deletion`),
        confirm: (message) => window.confirm(message),
        remove: () => authRequest(`/admin/products/${p.id}`, { method: "DELETE", body: { confirmSlug: p.slug } }),
      });
      if (outcome.status === "blocked") setActionError(`${p.name}: ${outcome.message}`);
      if (outcome.status === "deleted") {
        const carts = outcome.result?.removedFromCarts ?? 0;
        notify(`${p.name} deleted${carts ? ` (removed from ${carts} cart${carts === 1 ? "" : "s"})` : ""}.`);
        list.reload();
      }
    } catch (err) {
      setActionError(`${p.name}: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  const control = "h-10 rounded-lg border border-line bg-white px-3 text-base sm:text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";

  return (
    <Card>
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center mb-4">
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft.trim());
            setPage(1);
          }}
        >
          <label htmlFor="admin-product-search" className="sr-only">Search products</label>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="search" size={16} /></span>
          <input id="admin-product-search" type="search" value={draft} maxLength={100} onChange={(e) => setDraft(e.target.value)} placeholder="Name, slug or SKU — Enter" className={`${control} w-full pl-9`} />
        </form>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:flex">
          <label className="sr-only" htmlFor="admin-product-category">Category</label>
          <select id="admin-product-category" value={category} onChange={change(setCategory)} className={`${control} cursor-pointer`}>
            <option value="">All categories</option>
            {(categories.data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.shortName || c.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="admin-product-status">Status</label>
          <select id="admin-product-status" value={status} onChange={change(setStatus)} className={`${control} cursor-pointer`}>
            <option value="all">All statuses</option>
            <option value="active">Visible</option>
            <option value="draft">Draft</option>
            <option value="inactive">Hidden</option>
            <option value="archived">Archived</option>
          </select>
          <label className="sr-only" htmlFor="admin-product-image">Images</label>
          <select id="admin-product-image" value={imageFilter} onChange={change(setImageFilter)} className={`${control} cursor-pointer`}>
            <option value="">All images</option>
            <option value="missing">No usable image</option>
            <option value="usable">Has an image</option>
          </select>
          <label className="sr-only" htmlFor="admin-product-sort">Sort</label>
          <select id="admin-product-sort" value={sort} onChange={change(setSort)} className={`${control} cursor-pointer`}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="stock-asc">Stock: lowest first</option>
          </select>
        </div>
      </div>

      {actionError && <FormMessage tone="error" className="mb-3">{actionError}</FormMessage>}
      {list.status === "loading" && (
        <div role="status" aria-label="Loading products" className="grid gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      )}
      {list.status === "error" && <FormMessage tone="error">{list.error.message}</FormMessage>}
      {list.status === "ready" && (
        <>
          <p className="m-0 mb-2 text-xs text-muted" aria-live="polite">{list.data.pagination.total} products</p>
          {list.data.products.length === 0 ? (
            <EmptyState icon="search" title="No products found" description="Try a different search or filter, or add a product." className="!py-10" />
          ) : (
            <DataTable caption="Products" head={["Product", "Category", "Price", "Stock", "Sold", "Status", "Actions"]} minWidth={860}>
              {list.data.products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <ProductImage image={firstImage(p)} className="w-11 h-11 flex-shrink-0" rounded="rounded-lg" sizes="44px" />
                      <span className="min-w-0">
                        <Link href={adminProductHref(p.id)} className="block font-medium text-ink no-underline hover:text-forest">{p.name}</Link>
                        <span className="block text-xs text-muted">/{p.slug}{p.sku ? ` · ${p.sku}` : ""}</span>
                        {p.hasUsableImage === false && <span className="mt-0.5 inline-block"><StatusBadge status="failed" label="No usable image" /></span>}
                      </span>
                    </span>
                  </td>
                  <td className="text-muted whitespace-nowrap">{categoryName.get(p.category) ?? p.categorySlug}</td>
                  <td className="font-medium text-ink whitespace-nowrap">{formatPrice(p.price)}</td>
                  <td><StockCell product={p} /></td>
                  <td className="text-muted">{p.soldCount ?? 0}</td>
                  <td><StatusBadge status={productStatus(p)} label={productStatus(p) === "active" ? "Visible" : undefined} /></td>
                  <td>
                    <span className="flex gap-1.5">
                      <Link href={adminProductHref(p.id)} className={buttonClass({ variant: "outline", size: "sm" })}>
                        <Icon name="edit" size={13} />Edit<span className="sr-only"> {p.name}</span>
                      </Link>
                      {productStatus(p) === "active" && (
                        <Link href={productHref(p.slug)} className={buttonClass({ variant: "ghost", size: "sm" })} aria-label={`View ${p.name} in store`}>
                          <Icon name="eye" size={15} />
                        </Link>
                      )}
                      <Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => archiveOrRestore(p)}>
                        {p.archivedAt ? "Restore" : "Archive"}<span className="sr-only"> {p.name}</span>
                      </Button>
                      {p.hasUsableImage === false && (
                        <Button size="sm" variant="ghost" className="!text-danger" disabled={busyId !== null} onClick={() => deleteProduct(p)}>
                          <Icon name="trash" size={14} />Delete<span className="sr-only"> {p.name}</span>
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
          {list.data.pagination.totalPages > 1 && (
            <nav aria-label="Product pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</Button>
              <span className="text-muted">Page {list.data.pagination.page} of {list.data.pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= list.data.pagination.totalPages} onClick={() => setPage((n) => n + 1)}>Next</Button>
            </nav>
          )}
        </>
      )}
    </Card>
  );
}

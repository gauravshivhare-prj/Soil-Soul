"use client";

/**
 * ProductsTable — admin product list with search, category/stock filters
 * and a local delete action (demo; resets on reload).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { getCategories, getProducts } from "@/services/catalog";
import { formatPrice } from "@/lib/format";
import { adminProductHref, productHref } from "@/lib/routes";
import Card from "@/components/ui/Card";
import Button, { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import ProductImage from "@/components/ui/ProductImage";
import { StatusBadge, stockStatus } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/AdminParts";

export default function ProductsTable() {
  const categories = useMemo(() => getCategories(), []);
  const [products, setProducts] = useState(() => getProducts());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const { notify } = useToast();

  const visible = products.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (category && p.categorySlug !== category) return false;
    if (stock && stockStatus(p.stock) !== stock) return false;
    return true;
  });

  function remove(p) {
    if (!window.confirm(`Delete “${p.name}”? (Demo — this only hides it until you reload.)`)) return;
    setProducts((list) => list.filter((x) => x.id !== p.id));
    notify(`${p.name} deleted (demo)`);
  }

  const control = "h-10 rounded-lg border border-line bg-white px-3 text-base sm:text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";

  return (
    <Card>
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center mb-4">
        <div className="relative flex-1">
          <label htmlFor="admin-product-search" className="sr-only">Search products</label>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="search" size={16} /></span>
          <input id="admin-product-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" className={`${control} w-full pl-9`} />
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:flex">
          <label className="sr-only" htmlFor="admin-product-category">Category</label>
          <select id="admin-product-category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${control} cursor-pointer`}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.shortName}</option>)}
          </select>
          <label className="sr-only" htmlFor="admin-product-stock">Stock</label>
          <select id="admin-product-stock" value={stock} onChange={(e) => setStock(e.target.value)} className={`${control} cursor-pointer`}>
            <option value="">All stock levels</option>
            <option value="in-stock">In stock</option>
            <option value="low-stock">Low stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </div>
      </div>

      <p className="m-0 mb-2 text-xs text-muted" aria-live="polite">{visible.length} of {products.length} products</p>

      {visible.length === 0 ? (
        <EmptyState icon="search" title="No products found" description="Try a different search or filter." className="!py-10" />
      ) : (
        <DataTable caption="Products" head={["Product", "Category", "Price", "Stock", "Status", "Actions"]} minWidth={760}>
          {visible.map((p) => (
            <tr key={p.id}>
              <td>
                <span className="flex items-center gap-3">
                  <ProductImage image={p.image} className="w-11 h-11 flex-shrink-0" rounded="rounded-lg" sizes="44px" />
                  <span className="min-w-0">
                    <Link href={adminProductHref(p.slug)} className="block font-medium text-ink no-underline hover:text-forest">{p.name}</Link>
                    <span className="block text-xs text-muted">/{p.slug}</span>
                  </span>
                </span>
              </td>
              <td className="text-muted whitespace-nowrap">{p.category.shortName}</td>
              <td className="font-medium text-ink whitespace-nowrap">{formatPrice(p.price)}</td>
              <td className="text-ink">{p.stock}</td>
              <td><StatusBadge status={stockStatus(p.stock)} /></td>
              <td>
                <span className="flex gap-1.5">
                  <Link href={adminProductHref(p.slug)} className={buttonClass({ variant: "outline", size: "sm" })}>
                    <Icon name="edit" size={13} />Edit<span className="sr-only"> {p.name}</span>
                  </Link>
                  <Link href={productHref(p.slug)} className={buttonClass({ variant: "ghost", size: "sm" })} aria-label={`View ${p.name} in store`}>
                    <Icon name="eye" size={15} />
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => remove(p)} aria-label={`Delete ${p.name}`} className="!text-danger hover:!bg-[#fdecea]">
                    <Icon name="trash" size={15} />
                  </Button>
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}

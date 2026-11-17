"use client";

/**
 * InventoryManager — stock per unit (GET /admin/inventory): one row per product, or per variant
 * when a product has variants, lowest first, with low/out filters for units on sale. Stock is
 * changed with adjustments (POST /admin/inventory/adjustments: a signed quantity and a reason,
 * refused below zero) and each unit's history is shown (GET /admin/inventory/movements).
 *
 * A variant without stock of its own is sold from the product's shared stock; adjusting such a
 * variant starts tracking stock on the variant itself.
 */

import { useState, useMemo, useEffect } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge, { StatusBadge, stockStatus } from "@/components/ui/Badge";
import { SelectField, TextField } from "@/components/ui/Field";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/AdminParts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 50;
const THRESHOLD = 5;
const REASONS = [
  { value: "restock", label: "Restock (new stock arrived)" },
  { value: "correction", label: "Correction (count adjustment)" },
  { value: "damaged", label: "Damaged / unsellable" },
  { value: "returned_to_stock", label: "Returned to stock" },
  { value: "other", label: "Other (note required)" },
];
const REASON_LABEL = {
  initial: "Opening stock",
  restock: "Restock",
  correction: "Correction",
  damaged: "Damaged",
  returned_to_stock: "Returned to stock",
  other: "Other",
  sale: "Order",
  order_restore: "Order cancelled",
};

const unitKey = (u) => `${u.id}:${u.optionId ?? ""}`;
const unitName = (u) => (u.optionName ? `${u.name} · ${u.optionName}` : u.name);
/* Units that track their own stock; a variant on shared stock starts at 0 when first adjusted. */
const ownStock = (u) => (u.sharesProductStock ? 0 : u.stock ?? 0);

function UnitStock({ unit }) {
  if (unit.stock === null) return <Badge tone="danger">Not set</Badge>;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-ink font-medium">{unit.stock}</span>
      <StatusBadge status={stockStatus(unit.stock, THRESHOLD)} />
    </span>
  );
}

function ShopState({ unit }) {
  if (unit.archived) return <StatusBadge status="archived" />;
  if (unit.status === "draft") return <StatusBadge status="draft" />;
  if (!unit.live) return <StatusBadge status="inactive" label="Hidden" />;
  if (!unit.variantActive) return <StatusBadge status="inactive" label="Variant off" />;
  return <StatusBadge status="active" label="On sale" />;
}

function AdjustForm({ unit, onDone }) {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const available = ownStock(unit);
  const [mode, setMode] = useState("direct"); // "direct" = Set Exact Stock, "relative" = Add / Remove Delta
  const [directStock, setDirectStock] = useState(String(available));
  const [values, setValues] = useState({ direction: "add", qty: "5", reason: "restock", note: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const parsedDirect = parseInt(directStock, 10);
  const directDelta = Number.isFinite(parsedDirect) ? parsedDirect - available : 0;

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((x) => ({ ...x, [field]: "" }));
    setServerError(null);
  };

  const handleQuickAdd = (amount) => {
    const currentBase = Number.isFinite(parsedDirect) ? parsedDirect : available;
    const next = Math.max(0, currentBase + amount);
    setDirectStock(String(next));
    setErrors({});
  };

  async function submitDirect(e) {
    e.preventDefault();
    if (!/^\d+$/.test(directStock.trim()) || Number(directStock) < 0) {
      setErrors({ direct: "Enter a valid stock number of 0 or more." });
      return;
    }
    const target = Number(directStock);
    const delta = target - available;
    if (delta === 0) {
      setErrors({ direct: "Target stock is already " + available + "." });
      return;
    }
    setIsBusy(true);
    setServerError(null);
    try {
      const data = await authRequest("/admin/inventory/adjustments", {
        method: "POST",
        body: {
          productId: unit.id,
          ...(unit.optionId ? { optionId: unit.optionId } : {}),
          delta,
          reason: delta > 0 ? "restock" : "correction",
          note: `Updated directly to ${target}`,
        },
      });
      notify(`${unitName(unit)}: stock updated to ${data.product?.stock ?? target}.`);
      onDone();
    } catch (err) {
      setServerError(err.message);
      setIsBusy(false);
    }
  }

  async function submitRelative(e) {
    e.preventDefault();
    const found = {};
    if (!/^\d+$/.test(values.qty.trim()) || Number(values.qty) < 1) found.qty = "Enter a whole number of 1 or more.";
    else if (values.direction === "remove" && Number(values.qty) > available) found.qty = `Only ${available} in stock.`;
    if (values.reason === "other" && !values.note.trim()) found.note = "Add a note for “Other”.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setIsBusy(true);
    setServerError(null);
    try {
      const delta = Number(values.qty) * (values.direction === "remove" ? -1 : 1);
      const data = await authRequest("/admin/inventory/adjustments", {
        method: "POST",
        body: {
          productId: unit.id,
          ...(unit.optionId ? { optionId: unit.optionId } : {}),
          delta,
          reason: values.reason,
          ...(values.note.trim() ? { note: values.note.trim() } : {}),
        },
      });
      notify(`${unitName(unit)}: stock is now ${data.product?.stock ?? "updated"}.`);
      onDone();
    } catch (err) {
      setServerError(err.message);
      setIsBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
      {unit.sharesProductStock && (
        <FormMessage tone="info">
          This variant has no stock of its own yet and is sold from the product&rsquo;s shared stock ({unit.stock ?? "not set"}). Adjusting it starts tracking stock on this variant, beginning from 0.
        </FormMessage>
      )}

      {/* Mode Switcher */}
      <div className="flex rounded-lg border border-line bg-sand/40 p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("direct")}
          className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all cursor-pointer ${
            mode === "direct" ? "bg-white text-forest shadow-xs font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          Direct Set Stock
        </button>
        <button
          type="button"
          onClick={() => setMode("relative")}
          className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all cursor-pointer ${
            mode === "relative" ? "bg-white text-forest shadow-xs font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          Add / Remove (+/-)
        </button>
      </div>

      {mode === "direct" ? (
        <form onSubmit={submitDirect} noValidate className="grid gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Target Total Units
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={directStock}
                onChange={(e) => {
                  setDirectStock(e.target.value);
                  setErrors({});
                  setServerError(null);
                }}
                className="w-full h-10 px-3 rounded-lg border border-line bg-white text-base font-bold text-ink outline-none focus:border-forest focus:ring-1 focus:ring-forest/20"
                placeholder="0"
                required
              />
              <Button type="submit" disabled={isBusy} variant="primary" className="h-10 px-5 shrink-0">
                {isBusy ? "Saving…" : "Save Stock"}
              </Button>
            </div>
            {errors.direct && <p className="text-xs text-danger mt-1">{errors.direct}</p>}
          </div>

          {/* Quick calculation feedback */}
          <div className="rounded-lg bg-sand/30 p-2 text-xs flex items-center justify-between">
            <span className="text-muted">Current: <strong className="text-ink">{available}</strong></span>
            {Number.isFinite(parsedDirect) && directDelta !== 0 && (
              <span className={`font-semibold ${directDelta > 0 ? "text-forest" : "text-danger"}`}>
                {directDelta > 0 ? `+${directDelta} will be added` : `${directDelta} will be removed`}
              </span>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <p className="text-[11px] font-semibold text-muted mb-1.5">Quick Stock Adjust</p>
            <div className="flex flex-wrap gap-1.5">
              {[+1, +5, +10, +25, +50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-forest/10 text-forest hover:bg-forest hover:text-white transition-colors cursor-pointer"
                >
                  +{amt}
                </button>
              ))}
              {[-1, -5].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={submitRelative} noValidate className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Change"
              name="direction"
              value={values.direction}
              onChange={set("direction")}
              options={[{ value: "add", label: "Add stock (+)" }, { value: "remove", label: "Remove stock (-)" }]}
            />
            <TextField
              label="Quantity"
              name="qty"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={values.qty}
              onChange={set("qty")}
              error={errors.qty}
              required
            />
          </div>
          <SelectField label="Reason" name="reason" value={values.reason} onChange={set("reason")} options={REASONS} />
          <TextField
            label={values.reason === "other" ? "Note" : "Note (optional)"}
            name="note"
            value={values.note}
            onChange={set("note")}
            error={errors.note}
            maxLength={300}
          />
          <div>
            <Button type="submit" disabled={isBusy} className="w-full">
              {isBusy ? "Saving…" : "Save Adjustment"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function History({ unit }) {
  const params = new URLSearchParams({ productId: unit.id, limit: "20" });
  if (unit.optionId) params.set("optionId", unit.optionId);
  const { status, data, error } = useAuthedResource(`/admin/inventory/movements?${params}`);
  if (status === "loading") return <Skeleton className="h-24" />;
  if (status === "error") return <FormMessage tone="error">{error.message}</FormMessage>;
  if (data.movements.length === 0) return <p className="m-0 text-sm text-muted">No stock history recorded for this {unit.optionId ? "variant" : "product"} yet.</p>;
  return (
    <ul className="list-none m-0 p-0 divide-y divide-line text-sm">
      {data.movements.map((m) => (
        <li key={m.id} className="flex items-start justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block text-ink">{REASON_LABEL[m.reason] ?? m.reason}</span>
            <span className="block text-xs text-muted">{formatDate(m.createdAt)}{m.note ? ` · ${m.note}` : ""}</span>
          </span>
          <span className="text-right whitespace-nowrap">
            <span className={`block font-semibold ${m.delta < 0 ? "text-danger" : "text-forest"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
            {m.stockAfter != null && <span className="block text-xs text-muted">→ {m.stockAfter}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function InventoryManager() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { status, data, error, reload } = useAuthedResource(`/admin/inventory?filter=${filter}&threshold=${THRESHOLD}&page=${page}&limit=${PAGE_SIZE}`);
  // Use the freshly loaded row for the selected unit so its stock stays current.
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.sku?.toLowerCase().includes(q) ||
        u.slug?.toLowerCase().includes(q) ||
        u.optionName?.toLowerCase().includes(q)
    );
  }, [data?.items, searchQuery]);

  const current = selectedKey ? data?.items.find((u) => unitKey(u) === selectedKey) ?? selectedSnapshot : null;

  // Escape key closes modal
  useEffect(() => {
    if (!selectedKey) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedKey(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedKey]);

  return (
    <div className="w-full">
      <Card className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div role="group" aria-label="Filter stock" className="flex flex-wrap gap-2">
            {[["all", "All"], ["low", `Low (≤${THRESHOLD})`], ["out", "Out of stock"]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => { setFilter(id); setPage(1); }}
                className={`h-9 px-4 rounded-full border-0 text-[0.8125rem] font-medium cursor-pointer transition-colors
                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                            ${filter === id ? "bg-forest text-cream font-semibold shadow-xs" : "bg-sand text-ink hover:bg-[#ece6d8]"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="search"
              placeholder="Search product, SKU…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-xs bg-white border border-line rounded-lg outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 text-ink placeholder:text-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs p-0.5 border-0 bg-transparent cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <p className="m-0 mb-4 text-xs text-muted">
          {filter === "all" ? "Every product and variant, including drafts and hidden products." : "Only products and variants that are on sale."} Products with variants are listed per variant. Click &ldquo;Adjust&rdquo; to open the stock update popup.
        </p>
        {status === "loading" && (
          <div role="status" aria-label="Loading stock" className="grid gap-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}
          </div>
        )}
        {status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
        {status === "ready" && data.truncated && (
          <FormMessage tone="info" className="mb-3">The catalogue is very large; only the first 5,000 products are included here.</FormMessage>
        )}
        {status === "ready" &&
          (filteredItems.length === 0 ? (
            <EmptyState
              icon="box"
              title="Nothing here"
              description={searchQuery ? `No products match “${searchQuery}”.` : filter === "all" ? "No products yet." : filter === "low" ? "No items on sale are running low." : "Nothing on sale is out of stock."}
              className="!py-10"
            />
          ) : (
            <DataTable caption="Stock levels" head={["Product", "SKU", "Stock", "Shop", ""]} minWidth={680}>
              {filteredItems.map((unit) => {
                const key = unitKey(unit);
                const selected = current && unitKey(current) === key;
                return (
                  <tr key={key} aria-selected={selected || undefined} className={selected ? "bg-forest/5" : ""}>
                    <td>
                      <span className="block font-medium text-ink">{unit.name}</span>
                      <span className="block text-xs text-muted">
                        {unit.optionName ? <>Variant: {unit.optionName}{unit.sharesProductStock ? " · uses shared product stock" : ""}</> : `/${unit.slug}`}
                      </span>
                    </td>
                    <td className="text-muted">{unit.sku ?? "—"}</td>
                    <td><UnitStock unit={unit} /></td>
                    <td><ShopState unit={unit} /></td>
                    <td>
                      <Button size="sm" variant={selected ? "primary" : "outline"} onClick={() => { setSelectedKey(key); setSelectedSnapshot(unit); }}>
                        Adjust Stock
                        <span className="sr-only"> {unitName(unit)}</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          ))}
        {status === "ready" && data.pagination.totalPages > 1 && (
          <nav aria-label="Stock pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</Button>
            <span className="text-muted">Page {data.pagination.page} of {data.pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((n) => n + 1)}>Next</Button>
          </nav>
        )}
      </Card>

      {/* ─── Adjust Stock Pop-up Modal ─────────────────────────────────────── */}
      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedKey(null)}
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-line flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-sand/30">
              <div className="min-w-0 pr-4">
                <h2 id="adjust-modal-title" className="text-lg font-bold text-heading m-0 truncate">
                  Adjust Stock: {unitName(current)}
                </h2>
                <p className="text-xs text-muted m-0 mt-0.5">
                  Current stock: <strong className="text-ink">{current.stock ?? "not set"}</strong>
                  {current.sharesProductStock ? " (shared with product)" : ""}
                  {current.sku ? ` · SKU: ${current.sku}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center text-muted hover:text-ink hover:bg-sand/40 transition-colors cursor-pointer shrink-0"
                title="Close dialog"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <AdjustForm
                key={`${unitKey(current)}-${current.stock}-${current.sharesProductStock}`}
                unit={current}
                onDone={() => {
                  reload();
                  setHistoryKey((k) => k + 1);
                  setSelectedKey(null);
                }}
              />

              <div className="border-t border-line pt-4">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">
                  Recent Stock History
                </h3>
                <History key={`${unitKey(current)}-${historyKey}`} unit={current} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

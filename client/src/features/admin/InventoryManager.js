"use client";

/**
 * InventoryManager — stock levels (GET /admin/inventory, lowest first, with low/out
 * filters), stock adjustments (POST /admin/inventory/adjustments: a signed quantity
 * change with a reason, refused if it would take stock below zero) and the stock
 * history for a product (GET /admin/inventory/movements).
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { StatusBadge, stockStatus } from "@/components/ui/Badge";
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

function AdjustForm({ item, onDone }) {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const [values, setValues] = useState({ direction: "add", qty: "", reason: "restock", note: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((x) => ({ ...x, [field]: "" }));
    setServerError(null);
  };

  async function submit(e) {
    e.preventDefault();
    const found = {};
    if (!/^\d+$/.test(values.qty.trim()) || Number(values.qty) < 1) found.qty = "Enter a whole number of 1 or more.";
    else if (values.direction === "remove" && Number(values.qty) > item.stock) found.qty = `Only ${item.stock} in stock.`;
    if (values.reason === "other" && !values.note.trim()) found.note = "Add a note for “Other”.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setIsBusy(true);
    try {
      const delta = Number(values.qty) * (values.direction === "remove" ? -1 : 1);
      const data = await authRequest("/admin/inventory/adjustments", {
        method: "POST",
        body: { productId: item.id, delta, reason: values.reason, ...(values.note.trim() ? { note: values.note.trim() } : {}) },
      });
      notify(`${item.name}: stock is now ${data.product?.stock ?? "updated"}.`);
      onDone();
    } catch (err) {
      setServerError(err.message);
      setIsBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Change" name="direction" value={values.direction} onChange={set("direction")} options={[{ value: "add", label: "Add stock" }, { value: "remove", label: "Remove stock" }]} />
        <TextField label="Quantity" name="qty" type="number" min="1" step="1" inputMode="numeric" value={values.qty} onChange={set("qty")} error={errors.qty} required />
      </div>
      <SelectField label="Reason" name="reason" value={values.reason} onChange={set("reason")} options={REASONS} />
      <TextField label={values.reason === "other" ? "Note" : "Note (optional)"} name="note" value={values.note} onChange={set("note")} error={errors.note} maxLength={300} />
      <div><Button type="submit" disabled={isBusy}>{isBusy ? "Saving…" : "Save Adjustment"}</Button></div>
    </form>
  );
}

function History({ item }) {
  const { status, data, error } = useAuthedResource(`/admin/inventory/movements?productId=${item.id}&limit=20`);
  if (status === "loading") return <Skeleton className="h-24" />;
  if (status === "error") return <FormMessage tone="error">{error.message}</FormMessage>;
  if (data.movements.length === 0) return <p className="m-0 text-sm text-muted">No stock history recorded yet.</p>;
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
  const [selected, setSelected] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const { status, data, error, reload } = useAuthedResource(`/admin/inventory?filter=${filter}&threshold=${THRESHOLD}&page=${page}&limit=${PAGE_SIZE}`);
  // Use the freshly loaded row for the selected product so its stock stays current.
  const current = selected ? data?.items.find((i) => i.id === selected.id) ?? selected : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px] items-start">
      <Card className="min-w-0">
        <div role="group" aria-label="Filter stock" className="flex gap-2 mb-4">
          {[["all", "All"], ["low", `Low (≤${THRESHOLD})`], ["out", "Out of stock"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => { setFilter(id); setPage(1); }}
              className={`h-9 px-4 rounded-full border-0 text-[0.8125rem] font-medium cursor-pointer
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                          ${filter === id ? "bg-forest text-cream" : "bg-sand text-ink hover:bg-[#ece6d8]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {status === "loading" && (
          <div role="status" aria-label="Loading stock" className="grid gap-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}
          </div>
        )}
        {status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
        {status === "ready" &&
          (data.items.length === 0 ? (
            <EmptyState icon="box" title="Nothing here" description={filter === "all" ? "No products yet." : "No products match this stock filter."} className="!py-10" />
          ) : (
            <DataTable caption="Stock levels" head={["Product", "SKU", "Stock", "Shop", ""]} minWidth={620}>
              {data.items.map((item) => (
                <tr key={item.id} aria-selected={current?.id === item.id}>
                  <td>
                    <span className="block font-medium text-ink">{item.name}</span>
                    <span className="block text-xs text-muted">/{item.slug}</span>
                  </td>
                  <td className="text-muted">{item.sku ?? "—"}</td>
                  <td><span className="flex items-center gap-2 whitespace-nowrap"><span className="text-ink font-medium">{item.stock}</span><StatusBadge status={stockStatus(item.stock, THRESHOLD)} /></span></td>
                  <td><StatusBadge status={item.archived ? "archived" : item.isActive ? "active" : "inactive"} label={item.isActive ? "Visible" : undefined} /></td>
                  <td>
                    <Button size="sm" variant={current?.id === item.id ? "primary" : "outline"} onClick={() => setSelected(item)}>
                      Adjust<span className="sr-only"> {item.name}</span>
                    </Button>
                  </td>
                </tr>
              ))}
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

      <div className="grid gap-5 content-start">
        {current ? (
          <>
            <Card>
              <CardHeader title={`Adjust: ${current.name}`} />
              <p className="m-0 mb-3 text-sm text-muted">Current stock: <strong className="text-ink">{current.stock}</strong></p>
              <AdjustForm
                key={`${current.id}-${current.stock}`}
                item={current}
                onDone={() => {
                  reload();
                  setHistoryKey((k) => k + 1);
                }}
              />
            </Card>
            <Card>
              <CardHeader title="Stock History" />
              <History key={`${current.id}-${historyKey}`} item={current} />
            </Card>
          </>
        ) : (
          <Card>
            <p className="m-0 text-sm text-muted">Choose “Adjust” on a product to change its stock and see its history. Orders and cancellations update stock automatically.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

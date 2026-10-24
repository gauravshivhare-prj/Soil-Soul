"use client";

/**
 * OrdersTable — admin order list (GET /admin/orders) with server-side status filter,
 * search (order number, customer name/email or delivery phone) and paging.
 */

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button, { buttonClass } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { Avatar, DataTable } from "@/components/admin/AdminParts";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { PAYMENT_METHOD_LABEL, statusKey } from "@/features/orders/OrderParts";
import { formatDate, formatPrice, pluralize } from "@/lib/format";
import { adminOrderHref } from "@/lib/routes";

const PAGE_SIZE = 20;
const STATUSES = ["ALL", "PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const label = (s) => s[0] + s.slice(1).toLowerCase();

export default function OrdersTable() {
  const [status, setStatus] = useState("ALL");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (status !== "ALL") params.set("orderStatus", status);
  if (search) params.set("search", search);
  const { status: loadStatus, data, error } = useAuthedResource(`/admin/orders?${params}`);

  const choose = (s) => {
    setStatus(s);
    setPage(1);
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div role="group" aria-label="Filter by status" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => choose(s)}
              className={`flex-shrink-0 h-9 px-4 rounded-full border-0 text-[0.8125rem] font-medium cursor-pointer
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                          ${status === s ? "bg-forest text-cream" : "bg-sand text-ink hover:bg-[#ece6d8]"}`}
            >
              {label(s)}
            </button>
          ))}
        </div>
        <form
          role="search"
          className="relative lg:w-80"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(draft.trim());
            setPage(1);
          }}
        >
          <label htmlFor="admin-order-search" className="sr-only">Search orders</label>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="search" size={16} /></span>
          <input
            id="admin-order-search"
            type="search"
            value={draft}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Order #, customer or phone — Enter"
            className="w-full h-10 rounded-lg border border-line bg-white pl-9 pr-3 text-base sm:text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
        </form>
      </div>

      {loadStatus === "loading" && (
        <div role="status" aria-label="Loading orders" className="grid gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
        </div>
      )}
      {loadStatus === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
      {loadStatus === "ready" &&
        (data.orders.length === 0 ? (
          <EmptyState icon="bag" title="No orders found" description="Try another status or search term." className="!py-10" />
        ) : (
          <DataTable caption="Orders" head={["#", "Customer", "Items", "Amount", "Payment", "Status", "Date", ""]} minWidth={860}>
            {data.orders.map((o) => {
              const units = o.items.reduce((sum, item) => sum + item.quantity, 0);
              const customer = o.user?.name ?? o.deliveryAddress?.recipientName ?? "—";
              return (
                <tr key={o.id}>
                  <td className="font-medium text-ink whitespace-nowrap">#{o.orderNumber}</td>
                  <td>
                    <span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={customer} />{customer}</span>
                  </td>
                  <td className="text-muted whitespace-nowrap">{pluralize(units, "item")}</td>
                  <td className="font-medium text-ink">{formatPrice(o.total)}</td>
                  <td className="whitespace-nowrap">
                    <span className="block text-muted text-xs">{PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}</span>
                    <StatusBadge status={statusKey(o.paymentStatus)} />
                  </td>
                  <td><StatusBadge status={statusKey(o.orderStatus)} /></td>
                  <td className="text-muted whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  <td>
                    <Link href={adminOrderHref(o.orderNumber)} className={buttonClass({ variant: "outline", size: "sm" })}>
                      View<span className="sr-only"> order {o.orderNumber}</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ))}

      {loadStatus === "ready" && data.pagination.totalPages > 1 && (
        <nav aria-label="Order pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-muted">Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} orders</span>
          <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </nav>
      )}
    </Card>
  );
}

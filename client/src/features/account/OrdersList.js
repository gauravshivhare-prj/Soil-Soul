"use client";

/**
 * OrdersList — the signed-in customer's order history (GET /orders), newest first,
 * with status filter pills over the loaded page and Previous/Next paging.
 */

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import OrderRow from "./OrderRow";

const PAGE_SIZE = 20;
const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "In Progress", statuses: ["PLACED", "CONFIRMED", "PROCESSING"] },
  { id: "shipped", label: "Shipped", statuses: ["SHIPPED"] },
  { id: "delivered", label: "Delivered", statuses: ["DELIVERED"] },
  { id: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
];

export default function OrdersList() {
  const [page, setPage] = useState(1);
  const [filterId, setFilterId] = useState("all");
  const { status, data, error } = useAuthedResource(`/orders?page=${page}&limit=${PAGE_SIZE}`);

  if (status === "loading") {
    return (
      <Card>
        <div role="status" aria-label="Loading orders" className="grid gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }
  if (status === "error") return <FormMessage tone="error">{error.message}</FormMessage>;

  const { orders, pagination } = data;
  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  const matches = (f) => (o) => !f.statuses || f.statuses.includes(o.orderStatus);
  const visible = orders.filter(matches(filter));

  return (
    <Card>
      {orders.length > 0 && (
        <div role="group" aria-label="Filter orders by status" className="flex gap-2 overflow-x-auto pb-1 mb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filterId === f.id}
              onClick={() => setFilterId(f.id)}
              className={`flex-shrink-0 h-9 px-4 rounded-full border-0 text-[0.8125rem] font-medium cursor-pointer
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                          ${filterId === f.id ? "bg-forest text-cream" : "bg-sand text-ink hover:bg-[#ece6d8]"}`}
            >
              {f.label} <span className="opacity-70">({orders.filter(matches(f)).length})</span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon="box"
          title={pagination.total === 0 ? "No orders yet" : "No orders with this status"}
          description={pagination.total === 0 ? "When you place an order, it will appear here." : "Try another status filter."}
          action={pagination.total === 0 ? <Button href="/shop">Start Shopping</Button> : <Button variant="outline" onClick={() => setFilterId("all")}>Show all orders</Button>}
          className="!py-8"
        />
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-line">
          {visible.map((o) => <OrderRow key={o.id} order={o} />)}
        </ul>
      )}

      {pagination.totalPages > 1 && (
        <nav aria-label="Order pages" className="mt-5 flex items-center justify-between gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-muted">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </nav>
      )}
    </Card>
  );
}

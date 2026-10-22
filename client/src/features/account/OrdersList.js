"use client";

/**
 * OrdersList — account order history with status filter pills.
 */

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import OrderRow from "./OrderRow";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export default function OrdersList({ orders }) {
  const [status, setStatus] = useState("all");
  const visible = status === "all" ? orders : orders.filter((o) => o.status === status);

  return (
    <Card>
      <div role="group" aria-label="Filter orders by status" className="flex gap-2 overflow-x-auto pb-1 mb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? orders.length : orders.filter((o) => o.status === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={status === f.id}
              onClick={() => setStatus(f.id)}
              className={`flex-shrink-0 h-9 px-4 rounded-full border-0 text-[0.8125rem] font-medium cursor-pointer
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                          ${status === f.id ? "bg-forest text-cream" : "bg-sand text-ink hover:bg-[#ece6d8]"}`}
            >
              {f.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="box"
          title={orders.length === 0 ? "No orders yet" : "No orders with this status"}
          description={orders.length === 0 ? "When you place an order, it will appear here." : "Try another status filter."}
          action={orders.length === 0 ? <Button href="/shop">Start Shopping</Button> : <Button variant="outline" onClick={() => setStatus("all")}>Show all orders</Button>}
          className="!py-8"
        />
      ) : (
        <ul className="list-none m-0 p-0 divide-y divide-line">
          {visible.map((o) => <OrderRow key={o.id} order={o} />)}
        </ul>
      )}
    </Card>
  );
}

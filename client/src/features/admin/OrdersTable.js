"use client";

/**
 * OrdersTable — admin order list with search and status filter.
 */

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Avatar, DataTable } from "@/components/admin/AdminParts";
import { formatDate, formatPrice, pluralize } from "@/lib/format";
import { adminOrderHref } from "@/lib/routes";

const STATUSES = ["all", "processing", "shipped", "delivered", "cancelled"];

export default function OrdersTable({ orders }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = orders.filter(
    (o) => (status === "all" || o.status === status) && (!q || o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q))
  );

  return (
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div role="group" aria-label="Filter by status" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`flex-shrink-0 h-9 px-4 rounded-full border-0 text-[0.8125rem] font-medium capitalize cursor-pointer
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                          ${status === s ? "bg-forest text-cream" : "bg-sand text-ink hover:bg-[#ece6d8]"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <label htmlFor="admin-order-search" className="sr-only">Search orders</label>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="search" size={16} /></span>
          <input
            id="admin-order-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order # or customer"
            className="w-full h-10 rounded-lg border border-line bg-white pl-9 pr-3 text-base sm:text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="bag" title="No orders found" description="Try another status or search term." className="!py-10" />
      ) : (
        <DataTable caption="Orders" head={["#", "Customer", "Items", "Amount", "Payment", "Status", "Date", ""]} minWidth={820}>
          {visible.map((o) => (
            <tr key={o.id}>
              <td className="font-medium text-ink whitespace-nowrap">#{o.id}</td>
              <td><span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={o.customer.name} />{o.customer.name}</span></td>
              <td className="text-muted whitespace-nowrap">{pluralize(o.itemCount, "item")}</td>
              <td className="font-medium text-ink">{formatPrice(o.total)}</td>
              <td className="text-muted whitespace-nowrap">{o.payment}</td>
              <td><StatusBadge status={o.status} /></td>
              <td className="text-muted whitespace-nowrap">{formatDate(o.date)}</td>
              <td><Link href={adminOrderHref(o.id)} className={buttonClass({ variant: "outline", size: "sm" })}>View<span className="sr-only"> order {o.id}</span></Link></td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}

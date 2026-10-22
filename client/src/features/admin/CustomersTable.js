"use client";

/**
 * CustomersTable — searchable customer list (placeholder demo customers).
 */

import { useState } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Avatar, DataTable } from "@/components/admin/AdminParts";
import { formatDate, formatPrice } from "@/lib/format";

export default function CustomersTable({ customers }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = customers.filter((c) => !q || `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(q));

  return (
    <Card>
      <div className="relative mb-4 md:max-w-sm">
        <label htmlFor="customer-search" className="sr-only">Search customers</label>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="search" size={16} /></span>
        <input
          id="customer-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or city"
          className="w-full h-10 rounded-lg border border-line bg-white pl-9 pr-3 text-base sm:text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
        />
      </div>
      {visible.length === 0 ? (
        <EmptyState icon="users" title="No customers found" description="Try a different search." className="!py-10" />
      ) : (
        <DataTable caption="Customers" head={["Customer", "City", "Orders", "Total Spent", "Joined", "Status"]} minWidth={760}>
          {visible.map((c) => (
            <tr key={c.id}>
              <td>
                <span className="flex items-center gap-2.5">
                  <Avatar name={c.name} />
                  <span>
                    <span className="block font-medium text-ink whitespace-nowrap">{c.name}</span>
                    <span className="block text-xs text-muted">{c.email}</span>
                  </span>
                </span>
              </td>
              <td className="text-muted">{c.city}</td>
              <td className="text-ink">{c.orders}</td>
              <td className="font-medium text-ink">{formatPrice(c.spent)}</td>
              <td className="text-muted whitespace-nowrap">{formatDate(c.joined)}</td>
              <td><StatusBadge status={c.status} /></td>
            </tr>
          ))}
        </DataTable>
      )}
    </Card>
  );
}

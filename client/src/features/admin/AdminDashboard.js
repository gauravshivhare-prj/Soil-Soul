"use client";

/**
 * AdminDashboard — operational summary from GET /admin/dashboard/summary (real data only):
 * orders and order value in the chosen range, COD cash collected/refunded, orders by
 * status, stock alerts and recent orders.
 */

import { useState } from "react";
import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { AdminHeader, Avatar, DataTable, StatCard } from "@/components/admin/AdminParts";
import { DonutChart } from "@/components/admin/Charts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { statusKey } from "@/features/orders/OrderParts";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { adminOrderHref } from "@/lib/routes";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

const STATUS_COLORS = {
  PLACED: "#d9c9a3",
  CONFIRMED: "#c6d6b3",
  PROCESSING: "#ecd9b0",
  SHIPPED: "#9fbf8c",
  DELIVERED: "#24452a",
  CANCELLED: "#e07a5f",
};

const QUICK_ACTIONS = [
  { icon: "sprout", title: "Manage Products", text: "Add, edit or archive products.", href: "/admin/products" },
  { icon: "grid", title: "Manage Categories", text: "Organise products into categories.", href: "/admin/categories" },
  { icon: "list", title: "Inventory", text: "Adjust stock and review stock history.", href: "/admin/inventory" },
  { icon: "bag", title: "Orders", text: "Confirm, ship and complete orders.", href: "/admin/orders" },
  { icon: "refresh", title: "Returns & Refunds", text: "Review returns and process customer refunds.", href: "/admin/returns" },
];

function ViewAll({ href, children }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest no-underline hover:underline whitespace-nowrap">
      {children} <Icon name="arrow-right" size={14} />
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState("7d");
  const { status, data, error } = useAuthedResource(`/admin/dashboard/summary?range=${range}`);
  const rangeLabel = RANGES.find((r) => r.id === range)?.label;

  return (
    <div>
      <AdminHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        subtitle="Here's what's happening with your store."
        actions={
          <div>
            <label htmlFor="dashboard-range" className="sr-only">Date range</label>
            <select
              id="dashboard-range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-10 rounded-lg border border-line bg-white px-3 text-sm cursor-pointer outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
            >
              {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        }
      />

      {status === "loading" && (
        <div role="status" aria-label="Loading dashboard" className="grid gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}
      {status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}

      {status === "ready" && (() => {
        const s = data.summary;
        const statusTotal = Object.values(s.ordersByStatus).reduce((a, b) => a + b, 0);
        return (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              <StatCard icon="box" label="Orders placed" value={formatNumber(s.ordersInRange)} note={rangeLabel} />
              <StatCard icon="cart" label="Order value" value={formatPrice(s.orderValue)} note="Gross revenue" tone="gold" />
              <StatCard icon="cash" label="Cash collected" value={formatPrice(s.collectedAmount)} note={rangeLabel} />
              <StatCard
                icon="refresh"
                label="Refunds issued"
                value={formatPrice(s.refundedAmount)}
                note={s.refundedAmount > 0 ? `${s.refundCount || 0} refunds · Net: ${formatPrice(s.netRevenue)}` : "Zero refunds"}
                tone={s.refundedAmount > 0 ? "rose" : "default"}
              />
              <StatCard
                icon="alert"
                label="Alerts & Returns"
                value={formatNumber((s.lowStockCount || 0) + (s.outOfStockCount || 0) + (s.pendingReturnsCount || 0))}
                note={`${s.pendingReturnsCount || 0} returns to review · ${s.outOfStockCount || 0} out`}
                tone={s.pendingReturnsCount > 0 ? "gold" : "default"}
              />
            </div>

            {s.pendingReturnsCount > 0 && (
              <div className="mt-4 p-3.5 rounded-xl border border-amber-300 bg-amber-50 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="text-base">📦</span>
                  <span>
                    You have <strong>{s.pendingReturnsCount} customer return {s.pendingReturnsCount === 1 ? "request" : "requests"}</strong> pending review.
                  </span>
                </div>
                <Link href="/admin/returns" className="font-bold text-forest underline hover:text-leaf">
                  Review in Returns &rarr;
                </Link>
              </div>
            )}

            {s.pendingReconciliation > 0 && (
              <FormMessage tone="error" className="mt-4">
                {s.pendingReconciliation} cancelled {s.pendingReconciliation === 1 ? "order needs" : "orders need"} stock restoration retried.{" "}
                <Link href="/admin/orders" className="font-semibold">Open Orders (Cancelled filter)</Link>
              </FormMessage>
            )}

            <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-[1.6fr_1fr]">
              <Card className="min-w-0">
                <CardHeader title="Recent Orders" action={<ViewAll href="/admin/orders">View All Orders</ViewAll>} />
                {s.recentOrders.length === 0 ? (
                  <p className="m-0 text-sm text-muted">No orders yet.</p>
                ) : (
                  <DataTable caption="Recent orders" head={["#", "Customer", "Amount", "Status", "Date", ""]}>
                    {s.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="font-medium text-ink whitespace-nowrap">#{o.orderNumber}</td>
                        <td><span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={o.customerName ?? "?"} />{o.customerName ?? "—"}</span></td>
                        <td className="font-medium text-ink">{formatPrice(o.total)}</td>
                        <td><StatusBadge status={statusKey(o.orderStatus)} /></td>
                        <td className="text-muted whitespace-nowrap">{formatDate(o.createdAt)}</td>
                        <td><Link href={adminOrderHref(o.orderNumber)} className={buttonClass({ variant: "outline", size: "sm" })}>View<span className="sr-only"> order {o.orderNumber}</span></Link></td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </Card>
              <Card className="min-w-0">
                <CardHeader title="Orders by Status" action={<span className="text-xs text-muted">All time</span>} />
                <DonutChart
                  centerValue={statusTotal}
                  centerLabel="Orders"
                  segments={Object.entries(s.ordersByStatus).map(([k, v]) => ({ label: k[0] + k.slice(1).toLowerCase(), value: v, color: STATUS_COLORS[k] }))}
                />
              </Card>
            </div>
          </>
        );
      })()}

      <ul className="list-none m-0 p-0 mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {QUICK_ACTIONS.map((a) => (
          <li key={a.title}>
            <Link href={a.href} className="group flex items-center gap-3.5 h-full rounded-2xl border border-line bg-white p-4 no-underline shadow-[0_1px_3px_rgba(36,69,42,0.05)] hover:border-forest/40">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-sage-50 text-forest flex-shrink-0"><Icon name={a.icon} size={22} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink">{a.title}</span>
                <span className="block text-xs text-muted">{a.text}</span>
              </span>
              <Icon name="arrow-right" size={17} className="text-muted group-hover:text-forest" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

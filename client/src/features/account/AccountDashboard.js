"use client";

/**
 * AccountDashboard — the signed-in customer's overview: order count, recent orders
 * (GET /orders) and profile details from the session.
 */

import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import BotanicalSprig from "@/components/ui/BotanicalSprig";
import { PageTitle } from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import AccountStats from "./AccountStats";
import OrderRow from "./OrderRow";

export default function AccountDashboard() {
  const { user } = useAuth();
  const { status, data, error } = useAuthedResource("/orders?page=1&limit=5");

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-sand via-[#f6f1e6] to-sage-50 px-5 py-6 sm:px-7 sm:py-8">
        <BotanicalSprig className="hidden md:block right-[3%] -bottom-[30%] h-[170%] opacity-60" flip rotate={-14} eager />
        <div className="relative">
          <PageTitle>My Account</PageTitle>
          <p className="m-0 mt-1.5 text-sm sm:text-[0.9375rem] text-body max-w-lg">
            Track your orders, see your wishlist and manage your account settings.
          </p>
        </div>
      </section>

      <AccountStats orderCount={status === "ready" ? data.pagination.total : "–"} />

      <div className="grid gap-5 2xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader
            title="Recent Orders"
            action={<Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest no-underline hover:underline">View All Orders <Icon name="arrow-right" size={14} /></Link>}
          />
          {status === "loading" && (
            <div role="status" aria-label="Loading orders" className="grid gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}
          {status === "error" && <FormMessage tone="error">{error.message}</FormMessage>}
          {status === "ready" &&
            (data.orders.length === 0 ? (
              <p className="m-0 text-sm text-muted">
                No orders yet. <Link href="/shop" className="font-semibold text-forest">Start shopping</Link>
              </p>
            ) : (
              <ul className="list-none m-0 p-0 divide-y divide-line">
                {data.orders.map((o) => <OrderRow key={o.id} order={o} />)}
              </ul>
            ))}
        </Card>

        <Card className="content-start">
          <CardHeader
            title="Profile Information"
            action={
              <Link href="/account/settings" className={buttonClass({ variant: "outline", size: "sm" })}>
                <Icon name="edit" size={14} /> Edit
              </Link>
            }
          />
          <dl className="m-0 grid gap-2.5 text-sm">
            {[
              ["user", "Name", user?.name],
              ["mail", "Email", user?.email],
              ["phone", "Phone", user?.phone || "Not added"],
            ].map(([icon, label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <dt className="text-muted"><Icon name={icon} size={17} /><span className="sr-only">{label}</span></dt>
                <dd className="m-0 text-ink truncate">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}

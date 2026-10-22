import { notFound } from "next/navigation";
import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/Badge";
import { SectionTitle } from "@/components/ui/PageHeader";
import { OrderItems, OrderTimeline, OrderTotals } from "@/features/orders/OrderParts";
import { getAddresses, getOrder, getOrders } from "@/services/account";
import { formatAddress, formatDate } from "@/lib/format";

export function generateStaticParams() {
  return getOrders().map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Order #${id} | Soil & Soul` };
}

export default async function AccountOrderPage({ params }) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();
  const address = getAddresses().find((a) => a.id === order.addressId);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-muted no-underline hover:text-forest">
          <Icon name="arrow-left" size={15} /> Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <SectionTitle as="h1">Order #{order.id}</SectionTitle>
          <StatusBadge status={order.status} />
        </div>
        <p className="m-0 mt-1 text-sm text-muted">Placed on {formatDate(order.date)} · Paid via {order.payment}</p>
      </div>

      <Card>
        <OrderTimeline status={order.status} />
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Items" />
          <OrderItems items={order.items} />
        </Card>
        <div className="grid gap-5 content-start">
          <Card>
            <CardHeader title="Order Total" />
            <OrderTotals order={order} />
          </Card>
          {address && (
            <Card>
              <CardHeader title="Delivery Address" />
              <p className="m-0 text-sm font-semibold text-ink">{address.name}</p>
              <p className="m-0 mt-0.5 text-sm text-muted">{formatAddress(address)}</p>
              <p className="m-0 mt-0.5 text-sm text-muted">{address.phone}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

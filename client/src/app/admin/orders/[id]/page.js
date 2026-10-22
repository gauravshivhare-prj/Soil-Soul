import { notFound } from "next/navigation";
import Link from "next/link";
import Card, { CardHeader } from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { AdminHeader, Avatar } from "@/components/admin/AdminParts";
import { OrderItems, OrderTotals } from "@/features/orders/OrderParts";
import OrderStatusControl from "@/features/admin/OrderStatusControl";
import { getAdminOrder, getAdminOrders } from "@/services/admin";
import { formatDate, formatPrice } from "@/lib/format";

export function generateStaticParams() {
  return getAdminOrders().map((o) => ({ id: o.id }));
}

export const metadata = { title: "Order Details | Admin | Soil & Soul" };

export default async function AdminOrderPage({ params }) {
  const { id } = await params;
  const order = getAdminOrder(id);
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 mb-2 text-sm text-muted no-underline hover:text-forest">
        <Icon name="arrow-left" size={15} /> Back to orders
      </Link>
      <AdminHeader title={`Order #${order.id}`} subtitle={`Placed on ${formatDate(order.date)} · ${order.payment}`} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px] items-start">
        <div className="grid grid-cols-1 gap-5 min-w-0">
          <Card>
            <CardHeader title="Status" />
            <OrderStatusControl orderId={order.id} initialStatus={order.status} />
          </Card>
          <Card>
            <CardHeader title="Items" />
            <OrderItems items={order.items} />
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Customer" />
            <div className="flex items-center gap-3">
              <Avatar name={order.customer.name} />
              <div className="min-w-0 text-sm">
                <p className="m-0 font-semibold text-ink">{order.customer.name}</p>
                <p className="m-0 text-muted truncate">{order.customer.email}</p>
              </div>
            </div>
            <p className="m-0 mt-3 text-sm text-muted">
              {order.customer.city} · {order.customer.orders} orders · {formatPrice(order.customer.spent)} spent
            </p>
          </Card>
          <Card>
            <CardHeader title="Payment Summary" />
            <OrderTotals order={order} />
          </Card>
        </div>
      </div>
    </div>
  );
}

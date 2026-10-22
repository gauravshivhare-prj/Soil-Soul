import { AdminHeader } from "@/components/admin/AdminParts";
import OrdersTable from "@/features/admin/OrdersTable";
import { getAdminOrders } from "@/services/admin";

export const metadata = { title: "Orders | Admin | Soil & Soul" };

export default function AdminOrdersPage() {
  return (
    <div>
      <AdminHeader title="Orders" subtitle="Track and update customer orders." />
      <OrdersTable orders={getAdminOrders()} />
    </div>
  );
}

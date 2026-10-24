import { AdminHeader } from "@/components/admin/AdminParts";
import OrdersTable from "@/features/admin/OrdersTable";

export const metadata = { title: "Orders | Admin | Soil & Soul" };

export default function AdminOrdersPage() {
  return (
    <div>
      <AdminHeader title="Orders" subtitle="Track and update customer orders." />
      <OrdersTable />
    </div>
  );
}

import { AdminHeader } from "@/components/admin/AdminParts";
import OrdersTable from "@/features/admin/OrdersTable";

export const metadata = { title: "Orders | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminOrdersPage() {
  return (
    <div>
      <AdminHeader title="Orders" subtitle="Track and update customer orders." />
      <OrdersTable />
    </div>
  );
}

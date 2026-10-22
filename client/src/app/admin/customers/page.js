import { AdminHeader } from "@/components/admin/AdminParts";
import CustomersTable from "@/features/admin/CustomersTable";
import { getCustomers } from "@/services/admin";

export const metadata = { title: "Customers | Admin | Soil & Soul" };

export default function AdminCustomersPage() {
  return (
    <div>
      <AdminHeader title="Customers" subtitle="Placeholder customers for the demo." />
      <CustomersTable customers={getCustomers()} />
    </div>
  );
}

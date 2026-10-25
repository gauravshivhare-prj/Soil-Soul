import { AdminHeader } from "@/components/admin/AdminParts";
import InventoryManager from "@/features/admin/InventoryManager";

export const metadata = { title: "Inventory | Admin | Soil & Soul" };
export const instant = false;

export default function AdminInventoryPage() {
  return (
    <div>
      <AdminHeader title="Inventory" subtitle="Stock levels, adjustments and stock history." />
      <InventoryManager />
    </div>
  );
}

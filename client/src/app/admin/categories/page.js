import { AdminHeader } from "@/components/admin/AdminParts";
import CategoryManager from "@/features/admin/CategoryManager";

export const metadata = { title: "Categories | Admin | Soil & Soul" };

export default function AdminCategoriesPage() {
  return (
    <div>
      <AdminHeader title="Categories" subtitle="Organise your products into categories." />
      <CategoryManager />
    </div>
  );
}

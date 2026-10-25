import { AdminHeader } from "@/components/admin/AdminParts";
import CategoryManager from "@/features/admin/CategoryManager";

export const metadata = { title: "Categories | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminCategoriesPage() {
  return (
    <div>
      <AdminHeader title="Categories" subtitle="Organise your products into categories." />
      <CategoryManager />
    </div>
  );
}

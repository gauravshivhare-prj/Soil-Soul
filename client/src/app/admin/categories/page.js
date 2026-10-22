import { AdminHeader } from "@/components/admin/AdminParts";
import CategoryManager from "@/features/admin/CategoryManager";
import { getCategories } from "@/services/catalog";

export const metadata = { title: "Categories | Admin | Soil & Soul" };

export default function AdminCategoriesPage() {
  // Pass only plain fields to the client component (no image objects needed).
  const categories = getCategories().map(({ slug, name, shortName, tagline, productCount }) => ({ slug, name, shortName, tagline, productCount }));
  return (
    <div>
      <AdminHeader title="Categories" subtitle="Organise your products into categories." />
      <CategoryManager initialCategories={categories} />
    </div>
  );
}

import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminParts";
import Icon from "@/components/ui/Icon";
import ProductForm from "@/features/admin/ProductForm";

export const metadata = { title: "Add Product | Admin | Soil & Soul" };

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 mb-2 text-sm text-muted no-underline hover:text-forest">
        <Icon name="arrow-left" size={15} /> Back to products
      </Link>
      <AdminHeader title="Add Product" subtitle="Create a new product listing." />
      <ProductForm />
    </div>
  );
}

import { AdminHeader } from "@/components/admin/AdminParts";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import ProductsTable from "@/features/admin/ProductsTable";

export const metadata = { title: "Products | Admin | Soil & Soul" };

export default function AdminProductsPage() {
  return (
    <div>
      <AdminHeader
        title="Products"
        subtitle="Manage your catalog, pricing and stock."
        actions={<Button href="/admin/products/new"><Icon name="plus" size={16} />Add Product</Button>}
      />
      <ProductsTable />
    </div>
  );
}

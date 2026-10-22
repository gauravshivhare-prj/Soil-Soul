import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminParts";
import Icon from "@/components/ui/Icon";
import ProductForm from "@/features/admin/ProductForm";
import { getProduct, getProducts } from "@/services/catalog";

export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export const metadata = { title: "Edit Product | Admin | Soil & Soul" };

export default async function EditProductPage({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 mb-2 text-sm text-muted no-underline hover:text-forest">
        <Icon name="arrow-left" size={15} /> Back to products
      </Link>
      <AdminHeader title={`Edit: ${product.name}`} subtitle={`/${product.slug}`} />
      <ProductForm key={product.slug} product={product} />
    </div>
  );
}

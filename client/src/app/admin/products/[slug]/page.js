import AdminProductEdit from "@/features/admin/AdminProductEdit";

export const metadata = { title: "Edit Product | Admin | Soil & Soul" };

// The segment is named [slug] for historical reasons; it carries the product id
// (see adminProductHref), which is what the admin API looks products up by.
export default async function EditProductPage({ params }) {
  const { slug: id } = await params;
  return <AdminProductEdit productId={id} />;
}

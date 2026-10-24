import AdminOrderDetail from "@/features/admin/AdminOrderDetail";

export const metadata = { title: "Order Details | Admin | Soil & Soul" };

export default async function AdminOrderPage({ params }) {
  const { id } = await params;
  return <AdminOrderDetail orderId={id} />;
}

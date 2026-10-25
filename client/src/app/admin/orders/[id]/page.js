import AdminOrderDetail from "@/features/admin/AdminOrderDetail";

export const metadata = { title: "Order Details | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default async function AdminOrderPage({ params }) {
  const { id } = await params;
  return <AdminOrderDetail orderId={id} />;
}

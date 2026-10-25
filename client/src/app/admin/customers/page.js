import AdminCustomers from "@/features/admin/AdminCustomers";

export const metadata = { title: "Customers | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminCustomersPage() {
  return <AdminCustomers />;
}

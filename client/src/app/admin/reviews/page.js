import NotAvailable from "@/components/admin/NotAvailable";

export const metadata = { title: "Reviews | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminReviewsPage() {
  return <NotAvailable title="Reviews" icon="star" description="Product reviews aren't enabled yet, so there is nothing to moderate. Ratings are hidden in the shop." />;
}

import AdminReviews from "@/features/admin/AdminReviews";

export const metadata = { title: "Reviews | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminReviewsPage() {
  return <AdminReviews />;
}

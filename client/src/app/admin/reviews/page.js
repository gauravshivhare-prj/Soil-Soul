import { AdminHeader } from "@/components/admin/AdminParts";
import ReviewsModeration from "@/features/admin/ReviewsModeration";
import { getAdminReviews } from "@/services/admin";

export const metadata = { title: "Reviews | Admin | Soil & Soul" };

export default function AdminReviewsPage() {
  return (
    <div>
      <AdminHeader title="Reviews" subtitle="Approve or hide customer reviews." />
      <ReviewsModeration initialReviews={getAdminReviews()} />
    </div>
  );
}

import NotAvailable from "@/components/admin/NotAvailable";

export const metadata = { title: "Coupons & Offers | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminCouponsPage() {
  return <NotAvailable title="Coupons & Offers" icon="ticket" description="Coupons and offers aren't supported by checkout yet." />;
}

import NotAvailable from "@/components/admin/NotAvailable";

export const metadata = { title: "Analytics | Admin | Soil & Soul" };
// Rendered only after the client-side admin session check (RequireAuth in the admin frame),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AdminAnalyticsPage() {
  return <NotAvailable title="Analytics" icon="chart" description="Detailed analytics aren't available yet. The Dashboard shows order, cash and stock figures from real data." />;
}

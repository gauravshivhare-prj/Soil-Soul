import { SectionTitle } from "@/components/ui/PageHeader";
import OrdersList from "@/features/account/OrdersList";

export const metadata = { title: "My Orders | Soil & Soul" };
// Rendered only after the client-side account session check (RequireAuth in the account layout),
// so this segment cannot be rendered for instant-navigation validation.
export const instant = false;

export default function AccountOrdersPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">My Orders</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">Track your purchases and their delivery status.</p>
      </div>
      <OrdersList />
    </div>
  );
}

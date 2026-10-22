import { SectionTitle } from "@/components/ui/PageHeader";
import OrdersList from "@/features/account/OrdersList";
import { getOrders } from "@/services/account";

export const metadata = { title: "My Orders | Soil & Soul" };

export default function AccountOrdersPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">My Orders</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">Track, review and reorder your purchases.</p>
      </div>
      <OrdersList orders={getOrders()} />
    </div>
  );
}

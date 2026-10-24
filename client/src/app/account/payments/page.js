import { SectionTitle } from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";

export const metadata = { title: "Payment Methods | Soil & Soul" };

// Only Cash on Delivery is offered, so there is nothing to save here yet.
export default function PaymentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">Payment Methods</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">How you pay for orders.</p>
      </div>
      <Card>
        <EmptyState
          icon="cash"
          title="No saved payment methods"
          description="Orders are currently paid by Cash on Delivery, so no card or UPI details are stored."
          className="!py-10"
        />
      </Card>
    </div>
  );
}

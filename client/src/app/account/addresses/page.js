import { SectionTitle } from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export const metadata = { title: "Addresses | Soil & Soul" };

// There is no saved-address API yet: the delivery address is entered at checkout
// and stored with each order.
export default function AddressesPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">Addresses</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">Your delivery addresses.</p>
      </div>
      <Card>
        <EmptyState
          icon="pin"
          title="Saved addresses aren't available yet"
          description="Enter your delivery address at checkout — it's saved with that order and shown in your order details."
          action={<Button href="/account/orders" variant="outline">View My Orders</Button>}
          className="!py-10"
        />
      </Card>
    </div>
  );
}

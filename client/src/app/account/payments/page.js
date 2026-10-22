import { SectionTitle } from "@/components/ui/PageHeader";
import PaymentMethods from "@/features/account/PaymentMethods";
import { getPaymentMethods } from "@/services/account";

export const metadata = { title: "Payment Methods | Soil & Soul" };

export default function PaymentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle as="h1">Payment Methods</SectionTitle>
        <p className="m-0 mt-1 text-sm text-muted">Your saved ways to pay.</p>
      </div>
      <PaymentMethods initialMethods={getPaymentMethods()} />
    </div>
  );
}

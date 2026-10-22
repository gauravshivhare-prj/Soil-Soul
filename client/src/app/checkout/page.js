import PageHeader, { PageContainer } from "@/components/ui/PageHeader";
import CheckoutFlow from "@/features/checkout/CheckoutFlow";

export const metadata = { title: "Checkout | Soil & Soul" };

export default function CheckoutPage() {
  return (
    <main className="py-6 sm:py-8 lg:py-10">
      <PageContainer>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]}
          title="Checkout"
          subtitle="A few more steps to bring nature home."
          className="mb-6"
        />
        <CheckoutFlow />
      </PageContainer>
    </main>
  );
}

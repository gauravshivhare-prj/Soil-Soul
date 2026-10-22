import Link from "next/link";
import PageHeader, { PageContainer } from "@/components/ui/PageHeader";
import CartView from "@/components/store/CartView";
import Icon from "@/components/ui/Icon";

export const metadata = { title: "Your Cart | Soil & Soul" };

export default function CartPage() {
  return (
    <main className="py-6 sm:py-8 lg:py-10">
      <PageContainer>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Cart" }]}
          title="Your Cart"
          subtitle="Grow a greener tomorrow with your handpicked essentials."
          actions={
            <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-forest no-underline hover:text-forest-dark">
              <Icon name="arrow-left" size={15} /> Continue Shopping
            </Link>
          }
          className="mb-6"
        />
        <CartView />
      </PageContainer>
    </main>
  );
}

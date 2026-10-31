import ShopHero from "@/components/store/ShopHero";
import ShopCatalog from "@/components/store/ShopCatalog";
import { PageContainer } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Shop All Products | Soil & Soul",
  description: "Shop plants, growing supplies, tools, seeds and a small Natural Products collection.",
};

export default function ShopPage() {
  return (
    <main>
      <ShopHero
        title="Shop All Products"
        description="Explore plants, soil, gardening tools, seeds and a small Natural Products collection."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <ShopCatalog />
      </PageContainer>
    </main>
  );
}

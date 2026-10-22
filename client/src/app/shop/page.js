import ShopHero from "@/components/store/ShopHero";
import ShopCatalog from "@/components/store/ShopCatalog";
import { PageContainer } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Shop All Products | Soil & Soul",
  description: "Shop live plants, pots, soil, seeds, tools and plant-based natural care products.",
};

export default function ShopPage() {
  return (
    <main>
      <ShopHero
        title="Shop All Products"
        description="Discover a wide range of plants, pots, gardening essentials and natural care products to bring nature closer to you."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <ShopCatalog />
      </PageContainer>
    </main>
  );
}

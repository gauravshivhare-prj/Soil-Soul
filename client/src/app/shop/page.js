import ShopHero from "@/components/store/ShopHero";
import ShopCatalog from "@/components/store/ShopCatalog";
import { PageContainer } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Shop All Products | Soil & Soul",
  description: "Shop plants, living soil, tools, seeds and plant care essentials.",
};

export default function ShopPage() {
  return (
    <main>
      <ShopHero
        title="Shop All Products"
        description="Explore plants, living soil, gardening tools, seeds and plant care essentials."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <ShopCatalog />
      </PageContainer>
    </main>
  );
}

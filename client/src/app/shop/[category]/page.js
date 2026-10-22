import { notFound } from "next/navigation";
import ShopHero from "@/components/store/ShopHero";
import ShopCatalog from "@/components/store/ShopCatalog";
import { PageContainer } from "@/components/ui/PageHeader";
import { getCategories, getCategory } from "@/services/catalog";

export function generateStaticParams() {
  return getCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  return { title: category ? `${category.name} | Soil & Soul` : "Category not found | Soil & Soul" };
}

export default async function CategoryPage({ params }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  return (
    <main>
      <ShopHero
        title={category.name}
        description={category.tagline}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]}
      />
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <ShopCatalog key={slug} initialCategories={[slug]} />
      </PageContainer>
    </main>
  );
}

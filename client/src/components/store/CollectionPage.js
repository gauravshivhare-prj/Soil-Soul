/**
 * CollectionPage — legacy collection route helper. Canonical navigation now uses
 * the four root category pages under /shop/[category].
 */

import ShopHero from "@/components/store/ShopHero";
import ShopCatalog from "@/components/store/ShopCatalog";
import { PageContainer } from "@/components/ui/PageHeader";
import { getCollection } from "@/services/catalog";

export default function CollectionPage({ id }) {
  const collection = getCollection(id);
  return (
    <main>
      <ShopHero
        title={collection.title}
        description={collection.description}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: collection.title }]}
      />
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <ShopCatalog initialCategories={collection.categories} />
      </PageContainer>
    </main>
  );
}

"use client";

/**
 * CategoryCatalog — a category page loaded from the API (GET /categories/:slug): heading plus
 * the shop catalog preselected to that category. Unknown or inactive categories show "not found".
 */

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import ShopHero from "@/components/store/ShopHero";
import ShopCatalog from "@/components/store/ShopCatalog";
import { PageContainer } from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";

export default function CategoryCatalog({ slug }) {
  const [state, setState] = useState({ slug: null, category: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/categories/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((data) => setState({ slug, category: data.category, error: null }))
      .catch((error) => !controller.signal.aborted && setState({ slug, category: null, error }));
    return () => controller.abort();
  }, [slug]);

  if (state.slug !== slug) {
    return (
      <main>
        <PageContainer className="py-10" role="status" aria-label="Loading category">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-6 h-64" />
        </PageContainer>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="py-10">
        <PageContainer>
          {state.error.status === 404 ? (
            <EmptyState icon="leaf" title="Category not found" description="This category isn't available." action={<Button href="/shop">Browse the Shop</Button>} />
          ) : (
            <FormMessage tone="error">{state.error.message}</FormMessage>
          )}
        </PageContainer>
      </main>
    );
  }

  const { category } = state;
  return (
    <main>
      <ShopHero
        title={category.name}
        description={category.tagline || category.description}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]}
      />
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <ShopCatalog key={slug} initialCategories={[category.slug]} />
      </PageContainer>
    </main>
  );
}

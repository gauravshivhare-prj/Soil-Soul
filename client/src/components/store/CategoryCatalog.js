"use client";

/**
 * CategoryCatalog — a category page loaded from the API (GET /categories/:slug): heading plus
 * the shop catalog preselected to that category. Unknown or inactive categories show "not found".
 */

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { fetchCategories } from "@/services/catalogApi";
import ShopHero from "@/components/store/ShopHero";
import ShopCatalog from "@/components/store/ShopCatalog";
import { PageContainer } from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";

/* The category and all of its active subcategories (by parent links), so a parent page lists them too. */
function withDescendants(rootSlug, categories) {
  const slugs = [rootSlug];
  for (let i = 0; i < slugs.length && i < 200; i++) {
    for (const c of categories) if (c.parent?.slug === slugs[i] && !slugs.includes(c.slug)) slugs.push(c.slug);
  }
  return slugs;
}

export default function CategoryCatalog({ slug }) {
  const [state, setState] = useState({ slug: null, category: null, slugs: [], error: null });
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiRequest(`/categories/${encodeURIComponent(slug)}`, { signal: controller.signal }),
      // The subcategory list is a nice-to-have: without it the page still shows its own products.
      fetchCategories({ signal: controller.signal }).catch(() => []),
    ])
      .then(([data, categories]) => setState({ slug, category: data.category, slugs: withDescendants(data.category.slug, categories), error: null }))
      .catch((error) => !controller.signal.aborted && setState({ slug, category: null, slugs: [], error }));
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
        <ShopCatalog key={slug} initialCategories={state.slugs} />
      </PageContainer>
    </main>
  );
}

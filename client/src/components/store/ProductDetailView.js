"use client";

/**
 * ProductDetailView — product page body, loaded from the API (GET /products/:slug).
 * Shows only real catalog data: no ratings/reviews until genuine reviews exist, and no
 * shipping/returns/delivery promises until the owner approves those policies.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { fetchProduct, fetchProducts } from "@/services/catalogApi";
import { Breadcrumbs, PageContainer, SectionTitle } from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import ProductGallery from "@/components/store/ProductGallery";
import ProductPurchase from "@/components/store/ProductPurchase";
import ProductTabs from "@/components/store/ProductTabs";
import ProductCard from "@/components/store/ProductCard";

const SPEC_ICONS = ["ruler", "box", "sprout", "paw"];

function DetailsPanel({ product }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:gap-10">
      <div>
        {product.description ? <p className="m-0 text-sm leading-relaxed text-body">{product.description}</p> : <p className="m-0 text-sm text-muted">No description yet.</p>}
        {product.highlights.length > 0 && (
          <ul className="list-none m-0 mt-4 p-0 space-y-2">
            {product.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2.5 text-sm text-body">
                <span className="text-forest"><Icon name="check-circle" size={17} /></span>
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>
      {product.specs.length > 0 && (
        <dl className="m-0 grid gap-3 md:border-l md:border-line md:pl-8">
          {product.specs.map(([label, value], i) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sage-50 text-forest flex-shrink-0">
                <Icon name={SPEC_ICONS[i % SPEC_ICONS.length]} size={15} />
              </span>
              <dt className="w-28 flex-shrink-0 text-muted">{label}</dt>
              <dd className="m-0 text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function CarePanel({ product }) {
  return (
    <ul className="list-none m-0 p-0 grid gap-3 sm:grid-cols-2">
      {product.care.map((c) => (
        <li key={c.title} className="rounded-xl bg-cream border border-line p-4">
          <p className="m-0 text-sm font-semibold text-ink">{c.title}</p>
          <p className="m-0 mt-1 text-sm text-body">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

function SpecsPanel({ product }) {
  return (
    <table className="w-full max-w-xl text-sm border-collapse">
      <tbody>
        {[["Category", product.category.name], ...product.specs].map(([label, value]) => (
          <tr key={label} className="border-b border-line last:border-0">
            <th scope="row" className="py-2.5 pr-6 text-left font-normal text-muted w-44">{label}</th>
            <td className="py-2.5 text-ink">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function useProduct(slug) {
  const [state, setState] = useState({ slug: null, product: null, related: [], error: null });
  useEffect(() => {
    const controller = new AbortController();
    fetchProduct(slug, { signal: controller.signal })
      .then(async (product) => {
        let related = [];
        try {
          const data = await fetchProducts({ category: product.categorySlug, limit: 7 }, { signal: controller.signal });
          related = data.products.filter((p) => p.slug !== product.slug).slice(0, 6);
        } catch {
          related = [];
        }
        setState({ slug, product, related, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ slug, product: null, related: [], error });
      });
    return () => controller.abort();
  }, [slug]);
  return state.slug === slug ? state : { slug, product: null, related: [], error: null, isLoading: true };
}

export default function ProductDetailView({ slug }) {
  const { product, related, error, isLoading } = useProduct(slug);

  if (isLoading) {
    return (
      <main className="pb-12 lg:pb-16">
        <PageContainer className="pt-5 sm:pt-6">
          <div className="mt-4 grid gap-6 lg:grid-cols-2" role="status" aria-label="Loading product">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-40" />
            </div>
          </div>
        </PageContainer>
      </main>
    );
  }

  if (error) {
    return (
      <main className="py-10">
        <PageContainer>
          {error.status === 404 ? (
            <EmptyState icon="leaf" title="Product not found" description="This product isn't available. It may have been removed or renamed." action={<Button href="/shop">Browse the Shop</Button>} />
          ) : (
            <div className="max-w-xl mx-auto space-y-4">
              <FormMessage tone="error">{error.message}</FormMessage>
              <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
            </div>
          )}
        </PageContainer>
      </main>
    );
  }

  const tabs = [
    { id: "details", label: "Product Details", content: <DetailsPanel product={product} /> },
    ...(product.care.length ? [{ id: "care", label: product.categorySlug === "live-plants" ? "Care Guide" : "Usage & Care", content: <CarePanel product={product} /> }] : []),
    ...(product.specs.length ? [{ id: "specs", label: "Specifications", content: <SpecsPanel product={product} /> }] : []),
  ];

  return (
    <main className="pb-12 lg:pb-16">
      <PageContainer className="pt-5 sm:pt-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: product.category.shortName || product.category.name, href: `/shop/${product.categorySlug}` },
            { label: product.name },
          ]}
        />

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
          <div className="min-w-0">
            <ProductGallery product={product} />
          </div>
          <div className="min-w-0">
            {product.category.shortName && <Badge>{product.category.shortName}</Badge>}
            <h1 className={`${brandSerif.className} m-0 mt-2.5 text-[1.75rem] sm:text-[2.1rem] leading-tight font-bold text-heading`}>{product.name}</h1>
            {product.summary && <p className="m-0 mt-3 text-sm leading-relaxed text-body">{product.summary}</p>}
            <div className="mt-5">
              <ProductPurchase product={product} />
            </div>
          </div>
        </div>

        <Card padded={false} className="mt-10 min-w-0 px-4 sm:px-6 pb-6">
          <ProductTabs tabs={tabs} />
        </Card>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-12">
            <div className="flex items-end justify-between mb-4">
              <SectionTitle id="related-heading">You May Also Like</SectionTitle>
              <Link href={`/shop/${product.categorySlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest no-underline hover:text-forest-dark">
                View All <Icon name="arrow-right" size={15} />
              </Link>
            </div>
            <ul role="list" className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} imageAspect="aspect-[25/18]" sizes="(min-width: 1280px) 16vw, (min-width: 768px) 30vw, 50vw" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageContainer>
    </main>
  );
}

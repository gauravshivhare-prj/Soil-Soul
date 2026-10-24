"use client";

/**
 * WishlistView — products saved on this device, loaded from the catalog API as
 * product cards. Products that are no longer available are dropped from the list.
 */

import { useWishlist } from "@/features/wishlist/WishlistProvider";
import { useProductList } from "@/features/catalog/useProductList";
import { fetchProduct } from "@/services/catalogApi";
import ProductCard from "@/components/store/ProductCard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { EmptyState, FormMessage, ProductGridSkeleton } from "@/components/ui/States";

const loadSaved = (slugs) => (signal) =>
  Promise.allSettled(slugs.map((slug) => fetchProduct(slug, { signal }))).then((results) => {
    const failed = results.find((r) => r.status === "rejected" && r.reason?.status !== 404);
    if (failed) throw failed.reason;
    return results.filter((r) => r.status === "fulfilled" && r.value).map((r) => r.value);
  });

export default function WishlistView() {
  const { slugs, isReady } = useWishlist();
  const { status, products, error } = useProductList(loadSaved(slugs), isReady ? slugs.join(",") : null);

  if (!isReady || (slugs.length > 0 && status === "loading")) return <ProductGridSkeleton count={4} />;
  if (slugs.length > 0 && status === "error") return <FormMessage tone="error">{error.message}</FormMessage>;

  if (slugs.length === 0 || products.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="heart"
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here for later. Saved items are kept on this device."
          action={<Button href="/shop">Explore Products</Button>}
          className="!py-10"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="m-0 text-xs text-muted">Saved items are kept on this device.</p>
      <ul role="list" className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} imageAspect="aspect-[25/22]" sizes="(min-width: 1536px) 18vw, (min-width: 768px) 25vw, 50vw" />
          </li>
        ))}
      </ul>
    </div>
  );
}

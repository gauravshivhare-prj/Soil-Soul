"use client";

/**
 * WishlistView — saved products from the wishlist store, as product cards.
 */

import { useWishlist } from "@/features/wishlist/WishlistProvider";
import { getProductsBySlugs } from "@/services/catalog";
import ProductCard from "@/components/store/ProductCard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { EmptyState, ProductGridSkeleton } from "@/components/ui/States";

export default function WishlistView() {
  const { slugs, isReady } = useWishlist();

  if (!isReady) return <ProductGridSkeleton count={4} />;

  const products = getProductsBySlugs(slugs);
  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="heart"
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here for later."
          action={<Button href="/shop">Explore Products</Button>}
          className="!py-10"
        />
      </Card>
    );
  }

  return (
    <ul role="list" className="list-none m-0 p-0 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} imageAspect="aspect-[25/22]" sizes="(min-width: 1536px) 18vw, (min-width: 768px) 25vw, 50vw" />
        </li>
      ))}
    </ul>
  );
}

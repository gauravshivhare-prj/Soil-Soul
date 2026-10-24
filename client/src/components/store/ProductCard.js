"use client";

/**
 * ProductCard — shared product tile (homepage, shop, related products,
 * wishlist). Image and name link to the product page; the heart and
 * Add to Cart button work on the local cart/wishlist stores.
 *
 * Products with options (e.g. pot choice) are added with their default
 * choice; shoppers can change it on the product page.
 */

import Link from "next/link";
import { useCart } from "@/features/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { defaultOptionId, isInStock } from "@/services/catalogApi";
import { productHref } from "@/lib/routes";
import ProductImage from "@/components/ui/ProductImage";
import Stars from "@/components/ui/Stars";
import Price from "@/components/ui/Price";
import Icon from "@/components/ui/Icon";
import WishlistButton from "./WishlistButton";

export default function ProductCard({ product, imageAspect = "aspect-[25/24]", sizes }) {
  const { addItem } = useCart();
  const { notify } = useToast();
  const inStock = isInStock(product);
  const href = productHref(product.slug);

  async function handleAdd() {
    const result = await addItem(product, { optionId: defaultOptionId(product) });
    if (result.ok) notify(`${product.name} added to your cart`);
    else if (result.error) notify(result.error.message, { tone: "error" });
  }

  return (
    <article
      className="group flex flex-col h-full overflow-hidden rounded-xl bg-white border border-line
                 shadow-[0_1px_3px_rgba(36,69,42,0.05)]
                 transition-[transform,box-shadow,border-color] duration-300 ease-out
                 hover:-translate-y-1 hover:border-[#dcd5c4] hover:shadow-[0_12px_28px_rgba(36,69,42,0.12)]
                 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
          <ProductImage image={product.image} className={imageAspect} sizes={sizes} />
        </Link>
        <WishlistButton product={product} className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5" />
        {!inStock && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[0.625rem] font-semibold text-danger">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-2.5 pt-2.5 pb-2.5 sm:px-3">
        <span className="self-start max-w-full truncate rounded-full bg-sage-50 px-2 py-0.5 text-[0.625rem] sm:text-[0.6875rem] font-medium text-[#3d5a35]">
          {product.category.shortName}
        </span>

        <h3 className="m-0 mt-1.5 text-[0.8125rem] sm:text-sm font-semibold leading-snug text-ink">
          <Link href={href} className="text-inherit no-underline hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest rounded-sm">
            {product.name}
          </Link>
        </h3>

        <Stars rating={product.rating} count={product.reviewCount} size={11} className="mt-1" />

        <Price price={product.price} mrp={product.mrp} size="sm" showDiscount={false} className="mt-auto pt-2" />

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          className="mt-2 sm:mt-2.5 w-full h-8 sm:h-9 inline-flex items-center justify-center gap-1.5 rounded-md border-0 cursor-pointer
                     bg-forest text-cream text-xs font-medium transition-colors duration-200 hover:bg-forest-dark
                     disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          {inStock ? (
            <>
              <Icon name="cart" size={14} />
              Add to Cart
            </>
          ) : (
            "Out of Stock"
          )}
          <span className="sr-only">: {product.name}</span>
        </button>
      </div>
    </article>
  );
}

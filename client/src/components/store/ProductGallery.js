"use client";

/**
 * ProductGallery — main image with selectable thumbnails.
 *
 * Products have one image slot today (`product.image`, null → blank
 * placeholder). `views` reserves four gallery positions so the layout is
 * ready when multiple photos are added.
 */

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import WishlistButton from "./WishlistButton";

const VIEW_COUNT = 4;

export default function ProductGallery({ product }) {
  const views = Array.from({ length: VIEW_COUNT }, (_, i) => ({ id: i, image: i === 0 ? product.image : null }));
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
      <div role="group" aria-label="Product images" className="flex sm:flex-col gap-2.5 sm:gap-3">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActive(v.id)}
            aria-label={`Show image ${v.id + 1} of ${VIEW_COUNT}`}
            aria-pressed={active === v.id}
            className={`block p-0 rounded-lg overflow-hidden cursor-pointer border-2 bg-transparent transition-colors
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                        ${active === v.id ? "border-forest" : "border-transparent hover:border-sage-300"}`}
          >
            <ProductImage image={v.image} className="w-16 h-16 sm:w-[76px] sm:h-[76px]" sizes="80px" />
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-0">
        <ProductImage
          image={views[active].image}
          className="aspect-square sm:aspect-[6/5] lg:aspect-square"
          rounded="rounded-2xl"
          sizes="(min-width: 1024px) 40vw, 100vw"
          priority
        />
        <WishlistButton product={product} className="absolute top-3 right-3 sm:top-4 sm:right-4 !w-10 !h-10" />
      </div>
    </div>
  );
}

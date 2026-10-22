"use client";

/**
 * WishlistButton — heart toggle, saved in the wishlist store.
 * variant "overlay" sits on product images; "outline" is a bordered button.
 */

import { useWishlist } from "@/features/wishlist/WishlistProvider";
import { useToast } from "@/components/ui/Toast";
import Icon from "@/components/ui/Icon";

export default function WishlistButton({ product, variant = "overlay", className = "" }) {
  const { has, toggle, isReady } = useWishlist();
  const { notify } = useToast();
  const isSaved = isReady && has(product.slug);

  function handleClick() {
    const saved = toggle(product.slug);
    notify(saved ? `${product.name} saved to your wishlist` : `${product.name} removed from your wishlist`);
  }

  const look =
    variant === "overlay"
      ? "w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:bg-white"
      : "h-10 px-3 gap-2 rounded-lg border border-line bg-white text-sm hover:border-forest/50";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      className={`inline-flex items-center justify-center text-forest cursor-pointer transition-colors
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest
                  ${look} ${className}`}
    >
      <Icon name="heart" size={variant === "overlay" ? 16 : 18} filled={isSaved} strokeWidth={2} className={isSaved ? "text-[#c0392b]" : ""} />
      {variant !== "overlay" && <span>{isSaved ? "Saved" : "Wishlist"}</span>}
    </button>
  );
}

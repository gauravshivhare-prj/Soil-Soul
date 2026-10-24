"use client";

/**
 * CartLink — navbar cart icon with the live item-count badge.
 * The count appears once the signed-in cart has loaded from the API.
 */

import Link from "next/link";
import { useCart } from "@/features/cart/CartProvider";

export default function CartLink({ className, children }) {
  const { totals, isReady } = useCart();
  const count = isReady ? totals.itemCount : 0;

  return (
    <Link
      href="/cart"
      className={className}
      aria-label={count > 0 ? `Cart — ${count} ${count === 1 ? "item" : "items"}` : "Cart — empty"}
    >
      {children}
      {count > 0 && (
        <span
          className="absolute top-0.5 right-0 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-forest text-white
                     text-[0.65rem] font-bold leading-none flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

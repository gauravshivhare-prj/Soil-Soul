"use client";

/**
 * Client-side providers shared by every page: toasts, cart and wishlist.
 */

import { ToastProvider } from "@/components/ui/Toast";
import { CartProvider } from "@/features/cart/CartProvider";
import { WishlistProvider } from "@/features/wishlist/WishlistProvider";

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </ToastProvider>
  );
}

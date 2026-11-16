"use client";

/**
 * Client-side providers shared by every page: toasts, session, cart and wishlist.
 */

import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { CartProvider } from "@/features/cart/CartProvider";
import { WishlistProvider } from "@/features/wishlist/WishlistProvider";
import ChatbotWidget from "@/components/assistant/ChatbotWidget";

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            {children}
            <Suspense fallback={null}>
              <ChatbotWidget />
            </Suspense>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

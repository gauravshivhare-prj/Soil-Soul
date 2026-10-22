"use client";

/**
 * Wishlist state — a list of product slugs persisted to localStorage.
 * Starts empty for first-time visitors; the backend will own wishlists
 * once accounts are connected.
 */

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { getProduct } from "@/services/catalog";
import { createPersistedStore, hydrationStore } from "@/lib/persistedStore";

const STORAGE_KEY = "soilsoul.wishlist.v1";
const WishlistContext = createContext(null);

const EMPTY = [];
const wishlistStore = createPersistedStore(STORAGE_KEY, EMPTY, (saved) =>
  Array.isArray(saved) ? saved.filter((slug) => getProduct(slug)) : null
);

export function WishlistProvider({ children }) {
  const slugs = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot, wishlistStore.getServerSnapshot);
  const isReady = useSyncExternalStore(hydrationStore.subscribe, hydrationStore.getSnapshot, hydrationStore.getServerSnapshot);

  const has = useCallback((slug) => slugs.includes(slug), [slugs]);

  /* Returns the new state: true if now saved. */
  const toggle = useCallback(
    (slug) => {
      const willSave = !slugs.includes(slug);
      wishlistStore.set(willSave ? [...slugs, slug] : slugs.filter((s) => s !== slug));
      return willSave;
    },
    [slugs]
  );

  const remove = useCallback((slug) => wishlistStore.set(wishlistStore.getSnapshot().filter((s) => s !== slug)), []);

  const value = useMemo(() => ({ isReady, slugs, has, toggle, remove }), [isReady, slugs, has, toggle, remove]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}

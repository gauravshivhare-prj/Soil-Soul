"use client";

/**
 * Cart state backed by the server cart (GET/POST/PATCH/DELETE /cart).
 *
 * The server is authoritative for prices, stock and availability; the UI only displays what
 * it returns. Guests have no server cart: "Add to cart" sends them to sign in first (nothing is
 * stored for them), then they return to the page they were on.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";

export const MAX_QTY_PER_LINE = 10;

const CartContext = createContext(null);
const EMPTY_CART = { items: [], itemCount: 0, subtotal: 0, total: 0 };

/** Server cart line → component line shape. */
function toLine(item) {
  return {
    key: item.key,
    slug: item.slug,
    optionId: item.option?.id ?? null,
    option: item.option ?? null,
    qty: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    maxQty: Math.max(1, Math.min(MAX_QTY_PER_LINE, item.stock ?? 0)),
    isAvailable: item.isAvailable !== false,
    availabilityReason: item.availabilityReason ?? null,
    product: {
      id: item.productId,
      slug: item.slug,
      name: item.name,
      stock: item.stock ?? 0,
      image: item.image?.src ? { src: item.image.src, alt: item.image.alt || item.name } : null,
      category: { shortName: "" },
    },
  };
}

export function CartProvider({ children }) {
  const { isReady: authReady, isAuthenticated, authRequest, token } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState(null); // server cart for the current session, or null
  const [loadedFor, setLoadedFor] = useState(null); // token the cart was loaded for
  const [error, setError] = useState(null);

  // Load the cart whenever a new session becomes ready (and forget it on logout).
  useEffect(() => {
    if (!authReady || !isAuthenticated || loadedFor === token) return undefined;
    let cancelled = false;
    authRequest("/cart")
      .then((data) => {
        if (!cancelled) {
          setCart(data.cart);
          setError(null);
        }
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoadedFor(token));
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, token, loadedFor, authRequest]);

  const activeCart = isAuthenticated && loadedFor === token ? cart ?? EMPTY_CART : EMPTY_CART;

  const lines = useMemo(() => activeCart.items.map(toLine), [activeCart]);
  const totals = useMemo(
    () => ({
      itemCount: activeCart.itemCount,
      subtotal: activeCart.subtotal,
      discount: 0,
      shipping: 0,
      total: activeCart.total,
      hasUnavailable: activeCart.items.some((i) => i.isAvailable === false),
    }),
    [activeCart]
  );

  const mutate = useCallback(
    async (path, options) => {
      const data = await authRequest(path, options);
      setCart(data.cart);
      setError(null);
      return data.cart;
    },
    [authRequest]
  );

  const signInFirst = useCallback(() => {
    const here = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?next=${encodeURIComponent(here)}`);
  }, [router]);

  /**
   * Add a product (needs `product.id`). Resolves to { ok: true } or { ok: false, error? };
   * guests are redirected to sign in and nothing is stored.
   */
  const addItem = useCallback(
    async (product, { qty = 1, optionId = null } = {}) => {
      if (!isAuthenticated) {
        signInFirst();
        return { ok: false, redirected: true };
      }
      try {
        await mutate("/cart/items", { method: "POST", body: { productId: product.id, quantity: qty, ...(optionId ? { optionId } : {}) } });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err };
      }
    },
    [isAuthenticated, mutate, signInFirst]
  );

  const setQty = useCallback(
    async (key, qty) => {
      try {
        await mutate(`/cart/items/${encodeURIComponent(key)}`, { method: "PATCH", body: { quantity: qty } });
        return { ok: true };
      } catch (err) {
        setError(err);
        return { ok: false, error: err };
      }
    },
    [mutate]
  );

  const removeItem = useCallback(
    async (key) => {
      try {
        await mutate(`/cart/items/${encodeURIComponent(key)}`, { method: "DELETE" });
        return { ok: true };
      } catch (err) {
        setError(err);
        return { ok: false, error: err };
      }
    },
    [mutate]
  );

  /** Re-read the server cart (e.g. after checkout, which clears it on the server). */
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await authRequest("/cart");
      setCart(data.cart);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [isAuthenticated, authRequest]);

  const value = useMemo(
    () => ({
      // Ready once we know whether there is a session and, if so, its cart has loaded.
      isReady: authReady && (!isAuthenticated || loadedFor === token),
      isAuthenticated,
      lines,
      totals,
      error,
      addItem,
      setQty,
      removeItem,
      refresh,
    }),
    [authReady, isAuthenticated, loadedFor, token, lines, totals, error, addItem, setQty, removeItem, refresh]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

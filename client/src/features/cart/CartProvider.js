"use client";

/**
 * Cart state — React Context over a localStorage-backed external store
 * (useSyncExternalStore), so it survives reloads and syncs across tabs.
 *
 * Stores only { slug, optionId, qty } per line plus the applied coupon
 * code; product details and prices are looked up from the catalog service
 * on every render so they never go stale. Totals are display estimates —
 * the backend will recalculate everything at checkout.
 */

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { getProduct, isInStock } from "@/services/catalog";
import { COUPONS } from "@/data/commerce";
import { calculateTotals, validateCoupon } from "@/lib/pricing";
import { createPersistedStore, hydrationStore } from "@/lib/persistedStore";

const STORAGE_KEY = "soilsoul.cart.v1";
export const MAX_QTY_PER_LINE = 10;

const CartContext = createContext(null);

const lineKey = (slug, optionId) => `${slug}:${optionId ?? ""}`;

function maxQtyFor(product) {
  return Math.max(0, Math.min(MAX_QTY_PER_LINE, product.stock));
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { slug, optionId, qty, max } = action;
      const key = lineKey(slug, optionId);
      const existing = state.items.find((i) => i.key === key);
      const items = existing
        ? state.items.map((i) => (i.key === key ? { ...i, qty: Math.min(max, i.qty + qty) } : i))
        : [...state.items, { key, slug, optionId: optionId ?? null, qty: Math.min(max, qty) }];
      return { ...state, items };
    }
    case "setQty":
      return {
        ...state,
        items: state.items.map((i) => (i.key === action.key ? { ...i, qty: Math.max(1, Math.min(action.max, action.qty)) } : i)),
      };
    case "remove":
      return { ...state, items: state.items.filter((i) => i.key !== action.key) };
    case "clear":
      return { items: [], couponCode: null };
    case "coupon":
      return { ...state, couponCode: action.code };
    default:
      return state;
  }
}

const EMPTY = { items: [], couponCode: null };

// Drop lines whose product no longer exists in the catalog.
function sanitize(saved) {
  if (!saved || !Array.isArray(saved.items)) return null;
  return { items: saved.items.filter((i) => getProduct(i?.slug)), couponCode: saved.couponCode ?? null };
}

const cartStore = createPersistedStore(STORAGE_KEY, EMPTY, sanitize);

function dispatch(action) {
  cartStore.set(reducer(cartStore.getSnapshot(), action));
}

export function CartProvider({ children }) {
  const state = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  // The server can't see localStorage; consumers can wait for this before showing counts.
  const isReady = useSyncExternalStore(hydrationStore.subscribe, hydrationStore.getSnapshot, hydrationStore.getServerSnapshot);

  const lines = useMemo(
    () =>
      state.items.map((item) => {
        const product = getProduct(item.slug);
        const option = product.options?.choices.find((c) => c.id === item.optionId) ?? null;
        return {
          ...item,
          product,
          option,
          unitPrice: product.price + (option?.priceDelta ?? 0),
          maxQty: maxQtyFor(product),
        };
      }),
    [state.items]
  );

  const coupon = COUPONS.find((c) => c.code === state.couponCode) ?? null;
  const totals = useMemo(() => calculateTotals(lines, coupon), [lines, coupon]);

  /* Returns true if anything was added. */
  const addItem = useCallback((slug, { qty = 1, optionId = null } = {}) => {
    const product = getProduct(slug);
    if (!product || !isInStock(product)) return false;
    dispatch({ type: "add", slug, optionId, qty, max: maxQtyFor(product) });
    return true;
  }, []);

  const setQty = useCallback(
    (key, qty) => {
      const line = lines.find((l) => l.key === key);
      if (line) dispatch({ type: "setQty", key, qty, max: line.maxQty });
    },
    [lines]
  );

  const removeItem = useCallback((key) => dispatch({ type: "remove", key }), []);
  const clearCart = useCallback(() => dispatch({ type: "clear" }), []);

  const applyCoupon = useCallback(
    (code) => {
      const result = validateCoupon(code, totals.subtotal);
      if (result.ok) dispatch({ type: "coupon", code: result.coupon.code });
      return result;
    },
    [totals.subtotal]
  );
  const removeCoupon = useCallback(() => dispatch({ type: "coupon", code: null }), []);

  const value = useMemo(
    () => ({ isReady, lines, totals, coupon, addItem, setQty, removeItem, clearCart, applyCoupon, removeCoupon }),
    [isReady, lines, totals, coupon, addItem, setQty, removeItem, clearCart, applyCoupon, removeCoupon]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

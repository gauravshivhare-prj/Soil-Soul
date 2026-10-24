"use client";

import { useEffect, useState } from "react";

/**
 * Load a product list in the browser. `load(signal)` must resolve to an array of products;
 * `key` identifies the request (reloads when it changes).
 * @returns {{ status: "loading" | "ready" | "error", products: Object[], error: Error|null }}
 */
export function useProductList(load, key) {
  const [state, setState] = useState({ key: null, status: "loading", products: [], error: null });
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((products) => setState({ key, status: "ready", products, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key, status: "error", products: [], error });
      });
    return () => controller.abort();
    // `load` is expected to be stable for a given key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { key, status: "loading", products: [], error: null };
}

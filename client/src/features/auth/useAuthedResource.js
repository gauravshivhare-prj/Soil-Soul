"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

/**
 * GET an authenticated API path in the browser (refetches when `path` changes).
 * Pass `null` to skip. `reload()` fetches again; `replace(data)` swaps in fresh data
 * (e.g. the response of a mutation) without another request.
 * @returns {{ status: "loading" | "ready" | "error", data: any, error: Error|null, reload: Function, replace: Function }}
 */
export function useAuthedResource(path) {
  const { authRequest, isReady, isAuthenticated } = useAuth();
  const [state, setState] = useState({ key: null, status: "loading", data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const key = path && isReady && isAuthenticated ? `${path}#${nonce}` : null;

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    authRequest(path, { signal: controller.signal })
      .then((data) => setState({ key, status: "ready", data, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key, status: "error", data: null, error });
      });
    return () => controller.abort();
  }, [key, path, authRequest]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const replace = useCallback((data) => setState((s) => ({ ...s, status: "ready", data, error: null })), []);

  const current = state.key === key ? state : { status: "loading", data: null, error: null };
  return { ...current, reload, replace };
}

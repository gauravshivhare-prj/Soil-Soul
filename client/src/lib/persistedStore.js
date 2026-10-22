/**
 * Tiny localStorage-backed store for useSyncExternalStore.
 *
 *   const store = createPersistedStore("key", initialValue, sanitize);
 *   const value = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
 *   store.set(nextValue);
 *
 * - The server (and hydration) always sees `initialValue`, so markup matches.
 * - Snapshots are cached so React gets a stable reference between changes.
 * - Changes in other tabs arrive through the browser "storage" event.
 */

export function createPersistedStore(key, initialValue, sanitize = (v) => v) {
  let cache = null;
  let cacheRaw;
  const listeners = new Set();

  function read() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // Storage blocked: fall back to whatever we hold in memory.
      return cache ?? initialValue;
    }
    if (raw === cacheRaw && cache !== null) return cache;
    cacheRaw = raw;
    try {
      cache = raw ? sanitize(JSON.parse(raw)) ?? initialValue : initialValue;
    } catch {
      cache = initialValue; // Corrupt JSON: start fresh.
    }
    return cache;
  }

  function emit() {
    listeners.forEach((l) => l());
  }

  function onStorage(event) {
    if (event.key === key) emit();
  }

  return {
    getSnapshot: read,
    getServerSnapshot: () => initialValue,
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    set(next) {
      cache = next;
      try {
        cacheRaw = JSON.stringify(next);
        window.localStorage.setItem(key, cacheRaw);
      } catch {
        // Storage full or disabled: keep the in-memory value for this session.
      }
      emit();
    },
  };
}

/* True after hydration on the client; false on the server and during hydration. */
const noopSubscribe = () => () => {};
export const hydrationStore = {
  subscribe: noopSubscribe,
  getSnapshot: () => true,
  getServerSnapshot: () => false,
};

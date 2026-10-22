"use client";

/**
 * Lightweight toast notifications for short confirmations
 * ("Added to cart", "Saved to wishlist"). Announced to screen readers via
 * a polite live region; auto-dismiss after a few seconds.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

const ToastContext = createContext(null);
const DURATION_MS = 3200;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message, { tone = "success" } = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-[80] bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 flex flex-col gap-2 items-stretch sm:items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.15)]
                        motion-safe:animate-fade-up
                        ${t.tone === "error" ? "bg-[#fdecea] text-danger" : "bg-forest text-cream"}`}
          >
            <Icon name={t.tone === "error" ? "alert" : "check-circle"} size={18} />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-mr-1 p-1 rounded opacity-80 hover:opacity-100 cursor-pointer bg-transparent border-0 text-inherit"
              aria-label="Dismiss notification"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

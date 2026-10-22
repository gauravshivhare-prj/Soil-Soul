"use client";

/**
 * ProductTabs — Product Details / Care Guide / Specifications /
 * Shipping & Returns / Reviews. Accessible tabs pattern with arrow-key
 * navigation; panels are server-rendered content passed in as props.
 */

import { useId, useRef, useState } from "react";

export default function ProductTabs({ tabs }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  const baseId = useId();

  function onKeyDown(e) {
    const last = tabs.length - 1;
    let next = null;
    if (e.key === "ArrowRight") next = active === last ? 0 : active + 1;
    if (e.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Product information" onKeyDown={onKeyDown} className="flex overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${baseId}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`${baseId}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={`relative flex-shrink-0 px-4 sm:px-5 py-3 text-sm whitespace-nowrap bg-transparent border-0 cursor-pointer
                        focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-forest
                        ${active === i ? "font-semibold text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-forest" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          id={`${baseId}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={active !== i}
          tabIndex={0}
          className="pt-5 focus-visible:outline-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}

"use client";

/**
 * Pagination — ‹ 1 2 3 … 10 › with the current page marked aria-current.
 */

import Icon from "@/components/ui/Icon";

/* Page numbers with ellipses, always showing first, last and neighbours. */
function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

const BTN =
  "inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-md border text-sm cursor-pointer transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest " +
  "disabled:cursor-not-allowed disabled:opacity-40";

export default function Pagination({ page, totalPages, onChange, className = "" }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="list-none m-0 p-0 flex flex-wrap items-center justify-center gap-1.5">
        <li>
          <button type="button" className={`${BTN} border-line bg-white text-ink hover:border-forest/50`} onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
            <Icon name="arrow-left" size={16} />
          </button>
        </li>
        {pageList(page, totalPages).map((p) =>
          typeof p === "string" ? (
            <li key={p} className="px-1 text-muted" aria-hidden="true">…</li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${BTN} ${p === page ? "border-forest bg-forest text-cream" : "border-line bg-white text-ink hover:border-forest/50"}`}
              >
                {p}
              </button>
            </li>
          )
        )}
        <li>
          <button type="button" className={`${BTN} border-line bg-white text-ink hover:border-forest/50`} onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page">
            <Icon name="arrow-right" size={16} />
          </button>
        </li>
      </ul>
    </nav>
  );
}

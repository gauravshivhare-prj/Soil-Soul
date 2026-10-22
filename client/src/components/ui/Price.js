/**
 * Price — current price with optional struck-through MRP and % off badge.
 */

import { formatPrice } from "@/lib/format";

export default function Price({ price, mrp, size = "md", showDiscount = true, className = "" }) {
  const hasDiscount = mrp && mrp > price;
  const percent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const main = { sm: "text-base", md: "text-lg", lg: "text-[1.75rem]" }[size];

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
      <span className={`${main} font-bold text-ink`}>{formatPrice(price)}</span>
      {hasDiscount && (
        <>
          <s className="text-xs sm:text-sm text-faint">
            <span className="sr-only">Original price </span>
            {formatPrice(mrp)}
          </s>
          {showDiscount && (
            <span className="rounded-md bg-sage-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[#3d5a35]">{percent}% OFF</span>
          )}
        </>
      )}
    </span>
  );
}

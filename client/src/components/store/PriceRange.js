"use client";

/**
 * PriceRange — two-thumb slider (two overlaid native range inputs, so it
 * stays keyboard accessible) with the selected range shown as text.
 */

import { formatPrice } from "@/lib/format";

const THUMB =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-forest [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white " +
  "[&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:bg-forest [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer";

const INPUT =
  `absolute inset-0 w-full h-5 m-0 appearance-none bg-transparent pointer-events-none ${THUMB} ` +
  "focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-forest/40";

export default function PriceRange({ min, max, value, onChange, step = 50 }) {
  const [lo, hi] = value;
  const left = ((lo - min) / (max - min)) * 100;
  const right = ((hi - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted mb-3">
        <span>{formatPrice(lo)}</span>
        <span>{formatPrice(hi)}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 rounded-full bg-line" />
        <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-forest" style={{ left: `${left}%`, right: `${100 - right}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi - step), hi])}
          aria-label="Minimum price"
          aria-valuetext={formatPrice(lo)}
          className={INPUT}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + step)])}
          aria-label="Maximum price"
          aria-valuetext={formatPrice(hi)}
          className={INPUT}
        />
      </div>
    </div>
  );
}

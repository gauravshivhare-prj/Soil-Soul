"use client";

/**
 * PriceRange — smooth, dual-thumb range slider for price filtering.
 */

import { formatPrice } from "@/lib/format";

const THUMB =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none " +
  "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-forest [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white " +
  "[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing " +
  "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-115 " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-forest [&::-moz-range-thumb]:border-2 " +
  "[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab";

const INPUT =
  `absolute inset-0 w-full h-5 m-0 appearance-none bg-transparent pointer-events-none ${THUMB} ` +
  "focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-forest/40";

export default function PriceRange({ min, max, value, onChange, step = 10 }) {
  const [lo, hi] = value;

  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1000;
  const range = safeMax - safeMin || 1;

  const leftPercent = Math.max(0, Math.min(100, ((lo - safeMin) / range) * 100));
  const rightPercent = Math.max(0, Math.min(100, ((hi - safeMin) / range) * 100));

  const handleLoChange = (e) => {
    const newLo = Math.min(Number(e.target.value), hi - step);
    onChange([newLo, hi]);
  };

  const handleHiChange = (e) => {
    const newHi = Math.max(Number(e.target.value), lo + step);
    onChange([lo, newHi]);
  };

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between text-xs mb-3 font-mono">
        <span className="font-medium text-ink bg-sand/60 px-2 py-0.5 rounded-md">
          {formatPrice(lo)}
        </span>
        <span className="text-muted text-[11px] font-sans">to</span>
        <span className="font-medium text-ink bg-sand/60 px-2 py-0.5 rounded-md">
          {formatPrice(hi)}
        </span>
      </div>

      <div className="relative h-5 flex items-center px-0.5">
        {/* Inactive Track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-sand/80" />

        {/* Active Track Highlight */}
        <div
          className="absolute h-1.5 rounded-full bg-forest transition-all duration-75"
          style={{ left: `${leftPercent}%`, right: `${100 - rightPercent}%` }}
        />

        {/* Lower Thumb */}
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={lo}
          onChange={handleLoChange}
          aria-label="Minimum price"
          aria-valuetext={formatPrice(lo)}
          className={`${INPUT} ${leftPercent > 80 ? "z-30" : "z-20"}`}
        />

        {/* Upper Thumb */}
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={hi}
          onChange={handleHiChange}
          aria-label="Maximum price"
          aria-valuetext={formatPrice(hi)}
          className={`${INPUT} z-20`}
        />
      </div>
    </div>
  );
}

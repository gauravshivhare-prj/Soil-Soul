"use client";

/**
 * QuantitySelector — − [n] + stepper, clamped to [min, max].
 */

import Icon from "@/components/ui/Icon";

export default function QuantitySelector({ value, onChange, min = 1, max = 10, label = "Quantity", size = "md" }) {
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const btn =
    `${box} inline-flex items-center justify-center bg-white border-0 text-ink cursor-pointer ` +
    "hover:bg-sage-50 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-white " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-forest";

  return (
    <div role="group" aria-label={label} className="inline-flex items-stretch overflow-hidden rounded-lg border border-line bg-white">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Icon name="minus" size={16} />
      </button>
      <output aria-live="polite" className={`${size === "sm" ? "w-8" : "w-11"} flex items-center justify-center border-x border-line text-sm font-medium text-ink`}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

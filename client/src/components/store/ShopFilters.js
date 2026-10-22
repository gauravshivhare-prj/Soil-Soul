"use client";

/**
 * ShopFilters — sidebar filter groups for the Shop page. Stateless: the
 * parent owns `filters` and receives changes through `onChange(patch)`.
 */

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { Checkbox } from "@/components/ui/Field";
import PriceRange from "./PriceRange";

function Group({ title, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <fieldset className="m-0 p-0 border-0 border-b border-line py-4 first:pt-0 last:border-b-0">
      <legend className="sr-only">{title}</legend>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-ink
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest rounded"
      >
        {title}
        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} className="text-muted" />
      </button>
      {isOpen && <div className="mt-3 space-y-2.5">{children}</div>}
    </fieldset>
  );
}

function toggleIn(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function ShopFilters({ filters, onChange, onClear, categories, options, activeCount }) {
  return (
    <div>
      <Group title="Categories">
        <Checkbox
          label={<span>All Products <span className="text-faint">({categories.reduce((n, c) => n + c.productCount, 0)})</span></span>}
          checked={filters.categories.length === 0}
          onChange={() => onChange({ categories: [] })}
        />
        {categories.map((c) => (
          <Checkbox
            key={c.slug}
            label={<span>{c.shortName} <span className="text-faint">({c.productCount})</span></span>}
            checked={filters.categories.includes(c.slug)}
            onChange={() => onChange({ categories: toggleIn(filters.categories, c.slug) })}
          />
        ))}
      </Group>

      <Group title="Price Range">
        <PriceRange
          min={options.priceMin}
          max={options.priceMax}
          value={[filters.priceMin, filters.priceMax]}
          onChange={([priceMin, priceMax]) => onChange({ priceMin, priceMax })}
        />
      </Group>

      <Group title="Plant Type">
        {options.tags.map((t) => (
          <Checkbox key={t.id} label={t.label} checked={filters.tags.includes(t.id)} onChange={() => onChange({ tags: toggleIn(filters.tags, t.id) })} />
        ))}
      </Group>

      <Group title="Light Requirements" defaultOpen={false}>
        {options.lightLevels.map((l) => (
          <Checkbox key={l.id} label={l.label} checked={filters.light.includes(l.id)} onChange={() => onChange({ light: toggleIn(filters.light, l.id) })} />
        ))}
      </Group>

      <Group title="Size" defaultOpen={false}>
        {options.sizes.map((s) => (
          <Checkbox key={s.id} label={s.label} checked={filters.sizes.includes(s.id)} onChange={() => onChange({ sizes: toggleIn(filters.sizes, s.id) })} />
        ))}
      </Group>

      <Group title="Availability" defaultOpen={false}>
        <Checkbox label="In stock only" checked={filters.inStockOnly} onChange={() => onChange({ inStockOnly: !filters.inStockOnly })} />
      </Group>

      <button
        type="button"
        onClick={onClear}
        disabled={activeCount === 0}
        className="mt-4 w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm text-ink cursor-pointer
                   hover:border-forest/50 disabled:cursor-not-allowed disabled:opacity-50
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        <Icon name="refresh" size={15} />
        Clear Filters
      </button>
    </div>
  );
}

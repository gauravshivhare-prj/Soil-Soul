"use client";

/**
 * ShopFilters — sidebar filter groups for the Shop page. Stateless: the
 * parent owns `filters` and receives changes through `onChange(patch)`.
 *
 * Implements clean, modern accordion styling matching the store design system:
 * - Scoped "All [Category]" hero filter with active green badge
 * - Tree hierarchy with custom checkboxes, pill badges, and chevron expansion
 * - Smooth price range slider
 * - Fully responsive with zero horizontal overflow or wrapping glitches on mobile
 */

import { useState, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import PriceRange from "./PriceRange";

function Group({ title, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <fieldset className="m-0 p-0 border-0 border-b border-line/60 py-3.5 first:pt-0 last:border-b-0 w-full min-w-0">
      <legend className="sr-only">{title}</legend>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-ink
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest rounded select-none py-1"
      >
        <span>{title}</span>
        <Icon
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          className="text-stone-500 transition-transform duration-150"
        />
      </button>
      {isOpen && <div className="mt-2.5 space-y-1 w-full min-w-0 flex flex-col">{children}</div>}
    </fieldset>
  );
}

function toggleIn(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/**
 * Intelligent category selection in a hierarchy:
 * - When selecting a category:
 *   - Deselect its ancestors (so we narrow down to this specific subcategory)
 *   - Deselect its descendants (since this category already encompasses them)
 * - When deselecting: simply remove it.
 */
function updateCategorySelection(currentSelected, targetCat, allCategories) {
  const catById = new Map(allCategories.map((c) => [String(c.id ?? c._id), c]));
  const catBySlug = new Map(allCategories.map((c) => [c.slug, c]));

  // Find all ancestors of targetCat
  const ancestors = new Set();
  let curr = targetCat;
  for (let depth = 0; depth < 10 && curr?.parent; depth++) {
    const parentId = String(curr.parent.id ?? curr.parent._id ?? curr.parent);
    const parentCat = catById.get(parentId) || catBySlug.get(curr.parent.slug);
    if (!parentCat) break;
    ancestors.add(parentCat.slug);
    curr = parentCat;
  }

  // Find all descendants of targetCat
  const descendants = new Set();
  let frontier = [String(targetCat.id ?? targetCat._id)];
  for (let depth = 0; depth < 10 && frontier.length > 0; depth++) {
    const children = allCategories.filter(
      (c) => c.parent && frontier.includes(String(c.parent.id ?? c.parent._id ?? c.parent))
    );
    frontier = children.map((c) => String(c.id ?? c._id)).filter((id) => !descendants.has(id));
    for (const c of children) {
      descendants.add(c.slug);
    }
  }

  const isCurrentlySelected = currentSelected.includes(targetCat.slug);

  if (isCurrentlySelected) {
    return currentSelected.filter((slug) => slug !== targetCat.slug);
  } else {
    const next = currentSelected.filter(
      (slug) => slug !== targetCat.slug && !ancestors.has(slug) && !descendants.has(slug)
    );
    return [...next, targetCat.slug];
  }
}

/**
 * Clean Category Item Row matching the desired design:
 * - Custom checkbox with checkmark
 * - Category full display name
 * - Rounded count pill
 * - Chevron indicator for expandable subcategories
 */
function CategoryItemRow({
  category,
  count = 0,
  isSelected = false,
  onToggle,
  level = 0,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
}) {
  return (
    <div
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`w-full min-w-0 flex items-center justify-between py-2 px-2.5 rounded-xl transition-all duration-150 cursor-pointer group select-none ${
        isSelected
          ? "bg-[#edf4ee] text-forest font-semibold"
          : "hover:bg-[#f6f8f5] text-ink"
      } ${
        level === 1
          ? "ml-3.5 pl-2 border-l-2 border-stone-200"
          : level >= 2
          ? "ml-6 pl-2 border-l-2 border-stone-200/60 text-xs"
          : ""
      }`}
    >
      {/* Left side: Checkbox + Name */}
      <div className="flex items-center min-w-0 flex-1 mr-2">
        <div
          className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? "bg-[#24452a] border border-[#24452a] text-white shadow-xs"
              : "border border-stone-300 bg-white group-hover:border-[#24452a]/60"
          }`}
        >
          {isSelected && <Icon name="check" size={12} strokeWidth={2.75} />}
        </div>
        <span
          title={category.name || category.shortName}
          className={`truncate text-sm ml-2.5 transition-colors ${
            isSelected
              ? "font-semibold text-[#1e3926]"
              : "font-normal text-ink group-hover:text-forest"
          }`}
        >
          {category.name || category.shortName}
        </span>
      </div>

      {/* Right side: Count Badge + Chevron */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
            isSelected
              ? "bg-[#24452a] text-white font-semibold"
              : count === 0
              ? "bg-stone-100 text-stone-400"
              : "bg-[#f0f2ee] text-stone-600"
          }`}
        >
          {count}
        </span>

        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleExpand();
            }}
            className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-forest hover:bg-forest/10 rounded transition-colors cursor-pointer shrink-0"
            aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
          >
            <Icon
              name="chevron-right"
              size={13}
              className={`transition-transform duration-150 ${isExpanded ? "rotate-90 text-forest" : ""}`}
            />
          </button>
        ) : (
          <span className="w-5 h-5 flex items-center justify-center text-stone-400/80 shrink-0">
            <Icon name="chevron-right" size={13} />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Generic Filter Option Row for Tags, Light, Size, Availability
 */
function FilterOptionRow({ label, isChecked, onToggle }) {
  return (
    <div
      role="checkbox"
      aria-checked={isChecked}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`w-full min-w-0 flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-colors cursor-pointer group select-none ${
        isChecked ? "bg-[#edf4ee] text-forest font-medium" : "hover:bg-[#f6f8f5] text-ink"
      }`}
    >
      <div className="flex items-center min-w-0 flex-1 mr-2">
        <div
          className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${
            isChecked
              ? "bg-[#24452a] border border-[#24452a] text-white"
              : "border border-stone-300 bg-white group-hover:border-[#24452a]/60"
          }`}
        >
          {isChecked && <Icon name="check" size={12} strokeWidth={2.75} />}
        </div>
        <span className="truncate text-sm ml-2.5 text-ink group-hover:text-forest transition-colors">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function ShopFilters({
  filters,
  onChange,
  onClear,
  categories = [],
  options = {},
  activeCount = 0,
  currentCategory = null,
}) {
  // Pre-index counts by slug and ID
  const countMap = useMemo(() => {
    const map = new Map();
    for (const c of categories) {
      const count = c.productCount ?? 0;
      if (c.slug) map.set(c.slug, count);
      if (c.id) map.set(String(c.id), count);
      if (c._id) map.set(String(c._id), count);
    }
    return map;
  }, [categories]);

  const isScoped = Boolean(currentCategory);
  const rootId = currentCategory ? String(currentCategory.id ?? currentCategory._id) : null;
  const rootSlug = currentCategory?.slug;

  const [expandedSlugs, setExpandedSlugs] = useState({});

  const toggleExpand = (slug) => {
    setExpandedSlugs((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const catById = useMemo(() => new Map(categories.map((c) => [String(c.id ?? c._id), c])), [categories]);
  const catBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  // Check if a category has any currently selected descendant
  const hasSelectedDescendant = (cat) => {
    if (!filters.categories.length) return false;
    for (const selSlug of filters.categories) {
      let curr = catBySlug.get(selSlug);
      for (let depth = 0; depth < 10 && curr?.parent; depth++) {
        const pId = String(curr.parent.id ?? curr.parent._id ?? curr.parent);
        const parentCat = catById.get(parentId) || catBySlug.get(curr.parent.slug);
        if (parentCat?.slug === cat.slug) return true;
        curr = parentCat;
      }
    }
    return false;
  };

  const handleCategoryToggle = (cat, hasChildren) => {
    const isSelected = filters.categories.includes(cat.slug);
    const nextCategories = updateCategorySelection(filters.categories, cat, categories);
    onChange({ categories: nextCategories });
    if (!isSelected && hasChildren) {
      setExpandedSlugs((prev) => ({ ...prev, [cat.slug]: true }));
    }
  };

  const treeData = useMemo(() => {
    function isDescendantOfScope(cat) {
      if (!isScoped) return true;
      if (cat.slug === rootSlug || String(cat.id ?? cat._id) === rootId) return true;
      let curr = cat;
      for (let i = 0; i < 10; i++) {
        if (!curr?.parent) return false;
        const pId = String(curr.parent.id ?? curr.parent._id ?? curr.parent);
        if (pId === rootId || curr.parent.slug === rootSlug) return true;
        curr = catById.get(pId);
      }
      return false;
    }

    const relevant = categories.filter(isDescendantOfScope);

    if (isScoped) {
      // In a scoped category (e.g. Tools or Plants): direct children of currentCategory are topItems
      const topItems = relevant.filter(
        (c) => c.parent && (c.parent.slug === rootSlug || String(c.parent.id ?? c.parent._id ?? c.parent) === rootId)
      );

      const childrenMap = new Map();
      for (const c of relevant) {
        if (!c.parent) continue;
        const pSlug = c.parent.slug;
        if (!childrenMap.has(pSlug)) childrenMap.set(pSlug, []);
        childrenMap.get(pSlug).push(c);
      }

      const totalCount = countMap.get(rootSlug) ?? currentCategory.productCount ?? 0;
      return {
        scopeTitle: `All ${currentCategory.name}`,
        totalCount,
        topItems,
        childrenMap,
      };
    } else {
      // Global shop: the 4 main roots (Plants, Tools, Seeds, Natural Products) are topItems
      const topItems = categories.filter((c) => !c.parent);
      const childrenMap = new Map();
      for (const c of categories) {
        if (!c.parent) continue;
        const pSlug = c.parent.slug;
        if (!childrenMap.has(pSlug)) childrenMap.set(pSlug, []);
        childrenMap.get(pSlug).push(c);
      }

      const totalCount = topItems.reduce((sum, c) => sum + (c.productCount ?? 0), 0);
      return {
        scopeTitle: "All Products",
        totalCount,
        topItems,
        childrenMap,
      };
    }
  }, [categories, isScoped, rootId, rootSlug, currentCategory, countMap, catById]);

  const isAllActive = filters.categories.length === 0;

  return (
    <div className="w-full min-w-0">
      {/* Categories Accordion Group */}
      <Group title="Categories">
        <div className="flex flex-col space-y-1 w-full min-w-0">
          {/* Top Scoped "All [Category/Products]" Item (Image 4 Design) */}
          <div
            role="checkbox"
            aria-checked={isAllActive}
            tabIndex={0}
            onClick={() => onChange({ categories: [] })}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onChange({ categories: [] });
              }
            }}
            className={`w-full min-w-0 flex items-center justify-between py-2 px-2.5 rounded-xl transition-all duration-150 cursor-pointer group select-none ${
              isAllActive
                ? "bg-[#edf4ee] text-forest font-semibold"
                : "hover:bg-[#f6f8f5] text-ink"
            }`}
          >
            {/* Checkbox + Scope Title */}
            <div className="flex items-center min-w-0 flex-1 mr-2">
              <div
                className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center shrink-0 transition-colors ${
                  isAllActive
                    ? "bg-[#24452a] border border-[#24452a] text-white shadow-xs"
                    : "border border-stone-300 bg-white group-hover:border-[#24452a]/60"
                }`}
              >
                {isAllActive && <Icon name="check" size={12} strokeWidth={2.75} />}
              </div>
              <span
                className={`truncate text-sm ml-2.5 ${
                  isAllActive ? "font-semibold text-[#1e3926]" : "font-normal text-ink group-hover:text-forest"
                }`}
              >
                {treeData.scopeTitle}
              </span>
            </div>

            {/* Dark green pill badge when active (matching Image 4) */}
            <span
              className={`min-w-[22px] h-[22px] px-2 flex items-center justify-center rounded-full text-xs font-semibold shrink-0 transition-colors ${
                isAllActive ? "bg-[#24452a] text-white" : "bg-[#f0f2ee] text-stone-600"
              }`}
            >
              {treeData.totalCount}
            </span>
          </div>

          {/* Subcategory Hierarchy List */}
          {treeData.topItems.map((item) => {
            const children = treeData.childrenMap.get(item.slug) || [];
            const hasChildren = children.length > 0;
            const isExplicit = expandedSlugs[item.slug];
            const isExpanded = isExplicit !== undefined ? isExplicit : hasSelectedDescendant(item);
            const isSelected = filters.categories.includes(item.slug);
            const count = countMap.get(item.slug) ?? item.productCount ?? 0;

            return (
              <div key={item.slug} className="w-full min-w-0 flex flex-col space-y-1">
                <CategoryItemRow
                  category={item}
                  count={count}
                  isSelected={isSelected}
                  onToggle={() => handleCategoryToggle(item, hasChildren)}
                  level={0}
                  hasChildren={hasChildren}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleExpand(item.slug)}
                />

                {/* Level 2 Subcategories */}
                {hasChildren && isExpanded && (
                  <div className="flex flex-col space-y-1 w-full min-w-0 animate-in fade-in duration-150">
                    {children.map((child) => {
                      const grandChildren = treeData.childrenMap.get(child.slug) || [];
                      const hasGrandChildren = grandChildren.length > 0;
                      const isChildExplicit = expandedSlugs[child.slug];
                      const isChildExpanded =
                        isChildExplicit !== undefined ? isChildExplicit : hasSelectedDescendant(child);
                      const isChildSelected = filters.categories.includes(child.slug);
                      const childCount = countMap.get(child.slug) ?? child.productCount ?? 0;

                      return (
                        <div key={child.slug} className="w-full min-w-0 flex flex-col space-y-1">
                          <CategoryItemRow
                            category={child}
                            count={childCount}
                            isSelected={isChildSelected}
                            onToggle={() => handleCategoryToggle(child, hasGrandChildren)}
                            level={1}
                            hasChildren={hasGrandChildren}
                            isExpanded={isChildExpanded}
                            onToggleExpand={() => toggleExpand(child.slug)}
                          />

                          {/* Level 3 Subcategories */}
                          {hasGrandChildren && isChildExpanded && (
                            <div className="flex flex-col space-y-1 w-full min-w-0 animate-in fade-in duration-150">
                              {grandChildren.map((grandChild) => (
                                <CategoryItemRow
                                  key={grandChild.slug}
                                  category={grandChild}
                                  count={countMap.get(grandChild.slug) ?? grandChild.productCount ?? 0}
                                  isSelected={filters.categories.includes(grandChild.slug)}
                                  onToggle={() => handleCategoryToggle(grandChild, false)}
                                  level={2}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Group>

      {/* Price Range Accordion Group */}
      <Group title="Price Range">
        <PriceRange
          min={options.priceMin}
          max={options.priceMax}
          value={[filters.priceMin, filters.priceMax]}
          onChange={([priceMin, priceMax]) => onChange({ priceMin, priceMax })}
        />
      </Group>

      {/* Product Tags Group */}
      {options.tags && options.tags.length > 0 && (
        <Group title="Product Tags" defaultOpen={false}>
          <div className="flex flex-col space-y-1 w-full min-w-0">
            {options.tags.map((t) => (
              <FilterOptionRow
                key={t.id}
                label={t.label}
                isChecked={filters.tags.includes(t.id)}
                onToggle={() => onChange({ tags: toggleIn(filters.tags, t.id) })}
              />
            ))}
          </div>
        </Group>
      )}

      {/* Light Requirements Group */}
      {options.lightLevels && options.lightLevels.length > 0 && (
        <Group title="Light Requirements" defaultOpen={false}>
          <div className="flex flex-col space-y-1 w-full min-w-0">
            {options.lightLevels.map((l) => (
              <FilterOptionRow
                key={l.id}
                label={l.label}
                isChecked={filters.light.includes(l.id)}
                onToggle={() => onChange({ light: toggleIn(filters.light, l.id) })}
              />
            ))}
          </div>
        </Group>
      )}

      {/* Size Group */}
      {options.sizes && options.sizes.length > 0 && (
        <Group title="Size" defaultOpen={false}>
          <div className="flex flex-col space-y-1 w-full min-w-0">
            {options.sizes.map((s) => (
              <FilterOptionRow
                key={s.id}
                label={s.label}
                isChecked={filters.sizes.includes(s.id)}
                onToggle={() => onChange({ sizes: toggleIn(filters.sizes, s.id) })}
              />
            ))}
          </div>
        </Group>
      )}

      {/* Availability Group */}
      <Group title="Availability" defaultOpen={false}>
        <div className="flex flex-col space-y-1 w-full min-w-0">
          <FilterOptionRow
            label="In stock only"
            isChecked={filters.inStockOnly}
            onToggle={() => onChange({ inStockOnly: !filters.inStockOnly })}
          />
        </div>
      </Group>

      {/* Clear Filters Button */}
      <button
        type="button"
        onClick={onClear}
        disabled={activeCount === 0}
        className="mt-4 w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-medium text-ink cursor-pointer
                   hover:border-forest/50 hover:bg-[#f6f8f5] disabled:cursor-not-allowed disabled:opacity-50 transition-colors select-none
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        <Icon name="refresh" size={15} />
        Clear Filters
      </button>
    </div>
  );
}

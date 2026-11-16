"use client";

/**
 * ShopFilters — sidebar filter groups for the Shop page. Stateless: the
 * parent owns `filters` and receives changes through `onChange(patch)`.
 */

import { useState, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import { Checkbox } from "@/components/ui/Field";
import PriceRange from "./PriceRange";

function Group({ title, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <fieldset className="m-0 p-0 border-0 border-b border-line py-3.5 first:pt-0 last:border-b-0 w-full min-w-0">
      <legend className="sr-only">{title}</legend>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold text-ink
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest rounded"
      >
        <span>{title}</span>
        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} className="text-muted" />
      </button>
      {isOpen && <div className="mt-2.5 space-y-0.5 w-full min-w-0">{children}</div>}
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

function CategoryItemRow({
  category,
  count,
  isSelected,
  onToggle,
  level = 0,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
}) {
  return (
    <div
      className={`w-full min-w-0 flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors group select-none ${
        isSelected ? "bg-forest/10 text-forest font-semibold" : "hover:bg-sand/40 text-ink"
      } ${
        level === 1
          ? "ml-2.5 pl-2 border-l-2 border-line/70"
          : level >= 2
          ? "ml-[18px] pl-2 border-l-2 border-line/50 text-xs"
          : ""
      }`}
    >
      <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1 truncate py-0.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 rounded accent-forest cursor-pointer shrink-0"
        />
        <span
          title={category.name || category.shortName}
          className={`truncate text-sm ${level === 0 ? "font-medium" : "text-[13px]"}`}
        >
          {category.name || category.shortName}
        </span>
      </label>

      <div className="flex items-center gap-1 shrink-0 ml-1.5">
        <span
          className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
            isSelected
              ? "bg-forest text-cream font-semibold"
              : count === 0
              ? "bg-sand/40 text-faint"
              : "bg-sand/70 text-muted"
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
            className="w-6 h-6 flex items-center justify-center text-muted hover:text-forest hover:bg-forest/10 rounded transition-colors cursor-pointer shrink-0"
            aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
          >
            <Icon
              name="chevron-right"
              size={13}
              className={`transition-transform duration-150 ${isExpanded ? "rotate-90 text-forest" : ""}`}
            />
          </button>
        ) : (
          <span className="w-6 h-6 shrink-0" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

export default function ShopFilters({
  filters,
  onChange,
  onClear,
  categories,
  options,
  activeCount,
  currentCategory = null,
}) {
  // Backend facets pre-aggregates subtree counts for each category
  const countMap = useMemo(() => {
    const map = new Map();
    for (const c of categories) {
      map.set(c.slug, c.productCount ?? 0);
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
      // In a scoped category (e.g. Plants): direct children of Plants are the top items
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

      const totalCount = countMap.get(rootSlug) ?? 0;
      return {
        scopeTitle: `All ${currentCategory.name}`,
        totalCount,
        topItems,
        childrenMap,
      };
    } else {
      // Global shop: the 4 main roots are topItems
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

  return (
    <div className="w-full min-w-0">
      {/* Categories Group with Clean Hierarchy */}
      <Group title="Categories">
        {/* Top "All [Category/Products]" item */}
        <div
          className={`w-full min-w-0 flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors group select-none cursor-pointer ${
            filters.categories.length === 0 ? "bg-forest/10 text-forest font-semibold" : "hover:bg-sand/40 text-ink"
          }`}
          onClick={() => onChange({ categories: [] })}
        >
          <label
            className="flex items-center gap-2 cursor-pointer min-w-0 flex-1 truncate py-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={filters.categories.length === 0}
              onChange={() => onChange({ categories: [] })}
              className="w-4 h-4 rounded accent-forest cursor-pointer shrink-0"
            />
            <span className="truncate text-sm font-medium">{treeData.scopeTitle}</span>
          </label>
          <span
            className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
              filters.categories.length === 0 ? "bg-forest text-cream font-semibold" : "bg-sand/70 text-muted"
            }`}
          >
            {treeData.totalCount}
          </span>
        </div>

        {/* Tree Items */}
        {treeData.topItems.map((item) => {
          const children = treeData.childrenMap.get(item.slug) || [];
          const hasChildren = children.length > 0;
          const isExplicit = expandedSlugs[item.slug];
          const isExpanded = isExplicit !== undefined ? isExplicit : hasSelectedDescendant(item);
          const isSelected = filters.categories.includes(item.slug);
          const count = countMap.get(item.slug) ?? item.productCount ?? 0;

          return (
            <div key={item.slug} className="w-full min-w-0 space-y-0.5">
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

              {hasChildren && isExpanded && (
                <div className="space-y-0.5 w-full min-w-0 animate-in fade-in duration-150">
                  {children.map((child) => {
                    const grandChildren = treeData.childrenMap.get(child.slug) || [];
                    const hasGrandChildren = grandChildren.length > 0;
                    const isChildExplicit = expandedSlugs[child.slug];
                    const isChildExpanded =
                      isChildExplicit !== undefined ? isChildExplicit : hasSelectedDescendant(child);
                    const isChildSelected = filters.categories.includes(child.slug);
                    const childCount = countMap.get(child.slug) ?? child.productCount ?? 0;

                    return (
                      <div key={child.slug} className="w-full min-w-0 space-y-0.5">
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
                        {hasGrandChildren && isChildExpanded && (
                          <div className="space-y-0.5 w-full min-w-0 animate-in fade-in duration-150">
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
      </Group>

      {/* Price Range Group */}
      <Group title="Price Range">
        <PriceRange
          min={options.priceMin}
          max={options.priceMax}
          value={[filters.priceMin, filters.priceMax]}
          onChange={([priceMin, priceMax]) => onChange({ priceMin, priceMax })}
        />
      </Group>

      {/* Product Tags Group */}
      {options.tags.length > 0 && (
        <Group title="Product Tags">
          <div className="space-y-0.5 w-full min-w-0">
            {options.tags.map((t) => (
              <div
                key={t.id}
                className="w-full min-w-0 flex items-center justify-between py-1 px-2 rounded-lg hover:bg-sand/30 transition-colors"
              >
                <Checkbox
                  label={t.label}
                  checked={filters.tags.includes(t.id)}
                  onChange={() => onChange({ tags: toggleIn(filters.tags, t.id) })}
                  className="w-full min-w-0"
                />
              </div>
            ))}
          </div>
        </Group>
      )}

      {/* Light Requirements Group */}
      {options.lightLevels.length > 0 && (
        <Group title="Light Requirements" defaultOpen={false}>
          <div className="space-y-0.5 w-full min-w-0">
            {options.lightLevels.map((l) => (
              <div
                key={l.id}
                className="w-full min-w-0 flex items-center justify-between py-1 px-2 rounded-lg hover:bg-sand/30 transition-colors"
              >
                <Checkbox
                  label={l.label}
                  checked={filters.light.includes(l.id)}
                  onChange={() => onChange({ light: toggleIn(filters.light, l.id) })}
                  className="w-full min-w-0"
                />
              </div>
            ))}
          </div>
        </Group>
      )}

      {/* Size Group */}
      {options.sizes.length > 0 && (
        <Group title="Size" defaultOpen={false}>
          <div className="space-y-0.5 w-full min-w-0">
            {options.sizes.map((s) => (
              <div
                key={s.id}
                className="w-full min-w-0 flex items-center justify-between py-1 px-2 rounded-lg hover:bg-sand/30 transition-colors"
              >
                <Checkbox
                  label={s.label}
                  checked={filters.sizes.includes(s.id)}
                  onChange={() => onChange({ sizes: toggleIn(filters.sizes, s.id) })}
                  className="w-full min-w-0"
                />
              </div>
            ))}
          </div>
        </Group>
      )}

      {/* Availability Group */}
      <Group title="Availability" defaultOpen={false}>
        <div className="w-full min-w-0 flex items-center justify-between py-1 px-2 rounded-lg hover:bg-sand/30 transition-colors">
          <Checkbox
            label="In stock only"
            checked={filters.inStockOnly}
            onChange={() => onChange({ inStockOnly: !filters.inStockOnly })}
            className="w-full min-w-0"
          />
        </div>
      </Group>

      {/* Clear Filters Button */}
      <button
        type="button"
        onClick={onClear}
        disabled={activeCount === 0}
        className="mt-4 w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm text-ink cursor-pointer
                   hover:border-forest/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        <Icon name="refresh" size={15} />
        Clear Filters
      </button>
    </div>
  );
}

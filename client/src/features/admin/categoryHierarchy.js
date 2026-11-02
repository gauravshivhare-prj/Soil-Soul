/**
 * Category Hierarchy & Tree Helpers (Pure JS — no JSX, safe for node:test)
 * Enforces strict 3-level depth rules and hierarchical tree ordering.
 */

export const CANONICAL_ROOT_SLUGS = ["plants", "tools", "seeds", "natural-products"];

export const CSV_TEMPLATE_CONTENT = [
  "name,slug,shortName,tagline,description,parentSlug,displayOrder,imageUrl,visibleInShop",
  "Plants,plants,Plants,Fresh plants for home and garden,Explore our collection of indoor and outdoor plants,,1,https://ik.imagekit.io/animate20/Soil%20&%20Soul/Soil%20&%20Soul%20Desk%20Plant%20Combo.png,true",
  "Indoor Plants,indoor-plants,Indoor Plants,Thriving indoor greenery,Hardy houseplants for your living spaces,plants,1,https://ik.imagekit.io/animate20/Soil%20&%20Soul/Soil%20&%20Soul%20Desk%20Plant%20Combo.png,true",
  "Flowering Indoor Plants,flowering-indoor-plants,Flowering Plants,Vibrant blooms indoors,Indoor plants that produce beautiful flowers,indoor-plants,1,https://ik.imagekit.io/animate20/Soil%20&%20Soul/Soil%20&%20Soul%20Desk%20Plant%20Combo.png,true",
  "Outdoor Plants,outdoor-plants,Outdoor Plants,Garden and patio plants,Hardy greenery and flowering plants for open air,plants,2,,true",
  "Garden Shrubs,garden-shrubs,Garden Shrubs,Lush decorative garden bushes,Perennial outdoor shrubs and bushes,outdoor-plants,1,,true",
  "Tools,tools,Tools,Essential gardening tools,High quality tools for planting and garden maintenance,,2,,true",
  "Watering Tools,watering-tools,Watering Tools,Watering cans and sprayers,Keep your plants hydrated with the right gear,tools,1,,true",
  "Watering Cans,watering-cans,Watering Cans,Classic and precision watering cans,Gentle watering cans for seedlings and houseplants,watering-tools,1,,true",
  "Seeds,seeds,Seeds,Premium seeds for flowering and herbs,Start your garden from seed with tested varieties,,3,,true",
  "Flower Seeds,flower-seeds,Flower Seeds,Vibrant seasonal flower seeds,Easy to grow flower seeds for pots and beds,seeds,1,,true",
  "Annual Flower Seeds,annual-flower-seeds,Annuals,Year-round seasonal blooms,Beautiful annual flowering varieties,flower-seeds,1,,true",
  "Natural Products,natural-products,Natural Products,Pure plant-based care and wellness,Handcrafted natural care products,,4,,true",
  "Skin Care,skin-care,Skin Care,Gentle natural skin treatments,Botanical face and body care formulations,natural-products,1,,true",
  "Aloe Vera Products,aloe-vera-products,Aloe Vera,Soothing aloe vera skin care,Pure organic aloe vera gels and creams,skin-care,1,,true",
].join("\n");

/**
 * Extract string ID from category parent reference (handles string, object, or null).
 */
export function getParentId(parent) {
  if (!parent) return null;
  if (typeof parent === "object") {
    return parent.id ? String(parent.id) : parent._id ? String(parent._id) : null;
  }
  return String(parent);
}

/**
 * Determine the 1-based level of a category by tracing actual parent references (1 = Main, 2 = Subcategory, 3 = Second-level subcategory).
 */
export function getCategoryLevel(category, allCategories = []) {
  if (!category) return 1;
  const parentId = getParentId(category.parent);
  if (!parentId) return 1;

  const parent = allCategories.find((cat) => String(cat.id || cat._id) === parentId);
  if (!parent) return 2;

  const grandParentId = getParentId(parent.parent);
  if (!grandParentId) return 2;

  return 3;
}

/**
 * Compute the complete hierarchy path (e.g. "Plants → Indoor Plants → Flowering Plants").
 */
export function getHierarchyPath(category, allCategories = []) {
  if (!category) return "";
  const path = [category.name];
  const seen = new Set([String(category.id || category._id)]);
  let current = category;

  for (let depth = 0; depth < 5; depth++) {
    const parentId = getParentId(current?.parent);
    if (!parentId || seen.has(parentId)) break;
    seen.add(parentId);
    const parent = allCategories.find((cat) => String(cat.id || cat._id) === parentId);
    if (!parent) break;
    path.unshift(parent.name);
    current = parent;
  }

  return path.join(" → ");
}

/**
 * Find all descendant IDs of a given category to prevent cycles in the UI.
 */
export function getDescendantIds(targetId, allCategories = []) {
  const descendants = new Set();
  if (!targetId) return descendants;
  let frontier = [String(targetId)];

  for (let depth = 0; depth < 5 && frontier.length; depth++) {
    const next = allCategories
      .filter((c) => {
        const pId = getParentId(c.parent);
        return pId && frontier.includes(pId) && !descendants.has(String(c.id || c._id));
      })
      .map((c) => String(c.id || c._id));

    for (const id of next) descendants.add(id);
    frontier = next;
  }
  return descendants;
}

/**
 * Calculate the maximum height of the subtree rooted at categoryId (1 = leaf, 2 = parent of leaf, 3 = root with 2 levels).
 */
export function getSubtreeHeight(categoryId, allCategories = []) {
  if (!categoryId) return 1;
  const targetIdStr = String(categoryId);
  const children = allCategories.filter((c) => getParentId(c.parent) === targetIdStr);
  if (children.length === 0) return 1;

  let maxChildHeight = 1;
  for (const child of children) {
    maxChildHeight = Math.max(
      maxChildHeight,
      1 + getSubtreeHeight(child.id || child._id, allCategories)
    );
  }
  return maxChildHeight;
}

/**
 * Arrange categories hierarchically: roots first, followed immediately by their descendants.
 */
export function buildCategoryTree(categories = []) {
  const byId = new Map(categories.map((c) => [String(c.id || c._id), c]));
  const childrenMap = new Map();
  const roots = [];

  for (const c of categories) {
    const pId = getParentId(c.parent);
    if (pId && byId.has(pId)) {
      if (!childrenMap.has(pId)) childrenMap.set(pId, []);
      childrenMap.get(pId).push(c);
    } else {
      roots.push(c);
    }
  }

  const sortFn = (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name);
  roots.sort(sortFn);
  for (const list of childrenMap.values()) {
    list.sort(sortFn);
  }

  const flattened = [];
  function traverse(node, depth) {
    flattened.push({ ...node, displayLevel: depth });
    const children = childrenMap.get(String(node.id || node._id)) || [];
    for (const child of children) {
      traverse(child, depth + 1);
    }
  }

  for (const root of roots) {
    traverse(root, 1);
  }

  return flattened;
}

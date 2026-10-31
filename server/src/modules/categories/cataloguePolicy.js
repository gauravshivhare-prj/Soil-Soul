import { Category } from './category.model.js';

export const MAIN_CATEGORIES = Object.freeze([
  { name: 'Plants', slug: 'plants', displayOrder: 1 },
  { name: 'Tools', slug: 'tools', displayOrder: 2 },
  { name: 'Seeds', slug: 'seeds', displayOrder: 3 },
  { name: 'Natural Products', slug: 'natural-products', displayOrder: 4 },
]);

const MAIN_SLUGS = new Set(MAIN_CATEGORIES.map((category) => category.slug));
const MAX_DEPTH = 10;

/** Pure visibility policy shared by public category, product and review APIs. */
export function filterPublicCatalogueCategories(categories) {
  const map = new Map(categories.map((category) => [String(category._id), category]));
  const visible = categories.filter((category) => {
    if (!category.isActive || category.archivedAt) return false;
    let current = category;
    const seen = new Set();
    for (let depth = 0; current && depth <= MAX_DEPTH; depth++) {
      const id = String(current._id);
      if (seen.has(id) || !current.isActive || current.archivedAt) return false;
      seen.add(id);
      if (!current.parent) return MAIN_CATEGORIES.some((root) => root.slug === current.slug && root.name === current.name);
      current = map.get(String(current.parent));
    }
    return false;
  });
  return visible.sort(categoryOrder).map((category) => withPublicIds(category, map));
}

/** Active categories strictly rooted beneath the four canonical roots. */
export async function getPublicCatalogueCategories() {
  const categories = await Category.find({ isActive: true, archivedAt: null })
    .select('_id name slug shortName tagline description image displayOrder parent isActive archivedAt')
    .lean();
  return filterPublicCatalogueCategories(categories);
}

export async function getPublicCategoryById(categoryId) {
  const categories = await getPublicCatalogueCategories();
  return categories.find((category) => String(category._id) === String(categoryId)) ?? null;
}

function withPublicIds(category, map) {
  const parent = category.parent ? map.get(String(category.parent)) : null;
  return {
    ...category,
    id: String(category._id),
    parent: parent ? { id: String(parent._id), name: parent.name, slug: parent.slug, shortName: parent.shortName } : null,
  };
}

export function categoryOrder(a, b) {
  return (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name);
}

export async function getCategoryRoot(categoryId) {
  let current = await Category.findById(categoryId).select('_id slug name parent isActive archivedAt');
  if (!current) return null;
  const seen = new Set();
  for (let depth = 0; current && depth <= MAX_DEPTH; depth++) {
    const id = String(current._id);
    if (seen.has(id) || !current.isActive || current.archivedAt) return null;
    seen.add(id);
    if (!current.parent) return MAIN_CATEGORIES.some((root) => root.slug === current.slug && root.name === current.name) ? current : null;
    current = await Category.findById(current.parent).select('_id slug name parent isActive archivedAt');
  }
  return null;
}

export function isMainCategorySlug(slug) {
  return MAIN_SLUGS.has(slug);
}

import { Category } from './category.model.js';
import { Product } from '../products/product.model.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError, toDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import * as v from '../../utils/input.js';
import { withOptionalTransaction } from '../../utils/transaction.js';
import { getCategoryRoot, isMainCategorySlug, MAIN_CATEGORIES } from './cataloguePolicy.js';

const EDITABLE = ['name', 'shortName', 'tagline', 'description', 'image', 'displayOrder', 'isActive', 'parentId'];
const STATUS_FILTERS = ['all', 'active', 'inactive', 'archived'];

const notFound = () => createError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');

function readFields(body, { creating }) {
  const out = {};
  if (creating || 'name' in body) out.name = v.text(body.name, 'Name', { min: 2, max: 60 });
  if ('shortName' in body) out.shortName = v.text(body.shortName, 'Short name', { max: 40 });
  if ('tagline' in body) out.tagline = v.text(body.tagline, 'Tagline', { max: 120 });
  if ('description' in body) out.description = v.text(body.description, 'Description', { max: 1000 });
  if ('image' in body) out.image = body.image === null ? null : v.image(body.image, 'Category image');
  if ('displayOrder' in body) out.displayOrder = v.integer(body.displayOrder, 'Display order', { min: 0, max: 10000 });
  if ('isActive' in body) out.isActive = v.boolean(body.isActive, 'isActive');
  if ('parentId' in body) out.parent = body.parentId === null || body.parentId === '' ? null : v.objectId(body.parentId, 'parent category id');
  return out;
}

async function saveOrConflict(promise) {
  try {
    return await promise;
  } catch (err) {
    if (isDuplicateKeyError(err)) throw toDuplicateKeyError(err);
    throw err;
  }
}

async function withProductCounts(categories) {
  const allCategories = await Category.find({}).select('_id parent').lean();
  const ids = allCategories.map((c) => c._id);
  const counts = await Product.aggregate([
    { $match: { category: { $in: ids } } },
    { $group: { _id: '$category', total: { $sum: 1 }, active: { $sum: { $cond: [{ $and: [{ $ne: ['$isActive', false] }, { $in: ['$status', ['active', null]] }] }, 1, 0] } } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c]));
  return categories.map((category) => {
    const descendants = new Set([String(category._id)]);
    let frontier = [String(category._id)];
    for (let depth = 0; frontier.length && depth < 10; depth++) {
      frontier = allCategories.filter((candidate) => frontier.includes(String(candidate.parent)) && !descendants.has(String(candidate._id))).map((candidate) => String(candidate._id));
      for (const id of frontier) descendants.add(id);
    }
    let productCount = 0; let activeProductCount = 0;
    for (const id of descendants) {
      const count = byId.get(id);
      productCount += count?.total ?? 0;
      activeProductCount += count?.active ?? 0;
    }
    return { ...category.toJSON(), productCount, activeProductCount };
  });
}

const MAX_CATEGORY_DEPTH = 10;

/**
 * Refuse a parent that would create a cycle: walk up from the proposed parent and fail if the
 * category itself appears among its ancestors (bounded, so corrupt data can't loop forever).
 */
async function assertNoParentCycle(categoryId, parentId) {
  let current = parentId;
  for (let depth = 0; current; depth++) {
    if (String(current) === String(categoryId)) {
      throw createError(400, 'VALIDATION_ERROR', 'A category cannot be placed under itself or one of its subcategories.');
    }
    if (depth >= MAX_CATEGORY_DEPTH) {
      throw createError(400, 'VALIDATION_ERROR', `Categories can be nested at most ${MAX_CATEGORY_DEPTH} levels deep.`);
    }
    current = (await Category.findById(current).select('parent').lean())?.parent ?? null;
  }
}

/** All categories for admins, including inactive and archived ones. */
export async function listCategoriesAdmin(query = {}) {
  const { page, limit, skip } = v.pagination(query, { defaultLimit: 50, maxLimit: 100 });
  const status = query.status === undefined ? 'all' : v.oneOf(query.status, 'status', STATUS_FILTERS);
  const filter = {};
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') Object.assign(filter, { isActive: false, archivedAt: null });
  if (status === 'archived') filter.archivedAt = { $ne: null };
  if (query.q !== undefined) {
    const q = v.text(query.q, 'Search', { max: 100 });
    if (q) filter.$or = [{ name: { $regex: v.escapeRegex(q), $options: 'i' } }, { slug: { $regex: v.escapeRegex(q.toLowerCase()) } }];
  }
  const [categories, total] = await Promise.all([
    Category.find(filter).populate('parent', '_id name slug').sort({ displayOrder: 1, name: 1 }).skip(skip).limit(limit),
    Category.countDocuments(filter),
  ]);
  return {
    categories: await withProductCounts(categories),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

/** Idempotent, explicit admin initialization for the four canonical roots only. */
export async function initializeCanonicalCategories() {
  const results = [];
  const existingRoots = await Category.find({ slug: { $in: MAIN_CATEGORIES.map((item) => item.slug) } }).select('_id name slug parent isActive archivedAt');
  const bySlug = new Map(existingRoots.map((category) => [category.slug, category]));
  for (const definition of MAIN_CATEGORIES) {
    const category = bySlug.get(definition.slug);
    if (category && (category.parent || category.name !== definition.name)) {
      throw createError(409, 'CANONICAL_CATEGORY_CONFLICT', `The existing ${definition.slug} category is not the canonical ${definition.name} root.`);
    }
  }
  for (const definition of MAIN_CATEGORIES) {
    let category = bySlug.get(definition.slug) ?? null;
    if (category) {
      if (category.parent || category.name !== definition.name) {
        throw createError(409, 'CANONICAL_CATEGORY_CONFLICT', `The existing ${definition.slug} category is not the canonical ${definition.name} root.`);
      }
      if (!category.isActive || category.archivedAt) {
        category = await Category.findByIdAndUpdate(category._id, { $set: { isActive: true, archivedAt: null } }, { returnDocument: 'after' });
      }
      results.push({ id: String(category._id), name: category.name, slug: category.slug, created: false });
      continue;
    }
    let created = false;
    try {
      category = await Category.create({ name: definition.name, slug: definition.slug, shortName: definition.name, parent: null, displayOrder: definition.displayOrder, isActive: true });
      created = true;
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      category = await Category.findOne({ slug: definition.slug });
      if (!category || category.parent || category.name !== definition.name) {
        throw createError(409, 'CANONICAL_CATEGORY_CONFLICT', `The ${definition.slug} slug is already used by a noncanonical category.`);
      }
    }
    results.push({ id: String(category._id), name: category.name, slug: category.slug, created });
  }
  return { categories: results };
}

export async function getCategoryAdmin(id) {
  const category = await Category.findById(v.objectId(id, 'category id')).populate('parent', '_id name slug');
  if (!category) throw notFound();
  return (await withProductCounts([category]))[0];
}

export async function createCategory(body) {
  v.requireBody(body, ['slug', ...EDITABLE]);
  const fields = readFields(body, { creating: true });
  const slug = v.slug(body.slug ?? fields.name, 'Slug', { max: 80 });
  if (fields.parent) {
    const parent = await Category.findById(fields.parent).select('_id isActive archivedAt');
    if (!parent) throw createError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found.');
    if (!parent.isActive || parent.archivedAt) throw createError(409, 'PARENT_CATEGORY_ARCHIVED', 'Parent category must be active.');
    const configuredRoot = await getCategoryRoot(parent._id);
    if (!configuredRoot || !isMainCategorySlug(configuredRoot.slug)) {
      throw createError(409, 'INVALID_CATEGORY_TREE', 'New subcategories must belong to one of the four main catalogue categories.');
    }
  } else {
    const canonical = MAIN_CATEGORIES.find((item) => item.slug === slug && item.name === fields.name);
    if (!canonical) throw createError(409, 'TOP_LEVEL_CATEGORY_RESTRICTED', 'Only Plants, Tools, Seeds and Natural Products can be top-level categories. Use the initialize action to add canonical roots.');
  }
  const category = await saveOrConflict(Category.create({ ...fields, image: fields.image ?? undefined, slug }));
  return (await withProductCounts([category]))[0];
}

/** Update editable fields. The slug is immutable (products and public URLs reference it). */
export async function updateCategory(id, body) {
  v.requireBody(body, EDITABLE);
  if (Object.keys(body).length === 0) throw createError(400, 'VALIDATION_ERROR', 'Provide at least one field to update.');
  const fields = readFields(body, { creating: false });
  const existing = await Category.findById(v.objectId(id, 'category id'));
  if (!existing) throw notFound();
  const canonicalRoot = MAIN_CATEGORIES.find((item) => item.slug === existing.slug && !existing.parent);
  if (!existing.parent && !canonicalRoot && fields.parent === undefined && fields.isActive !== false) {
    throw createError(409, 'TOP_LEVEL_CATEGORY_RESTRICTED', 'Move this legacy category under a canonical root, deactivate or archive it, or delete it if empty.');
  }
  if (canonicalRoot && (fields.parent !== undefined || fields.isActive === false || (fields.name !== undefined && fields.name !== canonicalRoot.name))) {
    throw createError(409, 'MAIN_CATEGORY_PROTECTED', 'Main catalogue categories cannot be renamed, moved or deactivated.');
  }
  if (!existing.parent && fields.parent === null && !canonicalRoot) throw createError(409, 'TOP_LEVEL_CATEGORY_RESTRICTED', 'Only the four canonical catalogue roots can remain at the top level.');
  if (existing.archivedAt && fields.isActive === true) {
    throw createError(409, 'CATEGORY_ARCHIVED', 'Restore the archived category before activating it.');
  }
  if (fields.isActive === false) {
    const [activeProducts, activeChildren] = await Promise.all([
      Product.countDocuments({ category: existing._id, isActive: true, status: { $in: ['active', null] } }),
      Category.countDocuments({ parent: existing._id, isActive: true, archivedAt: null }),
    ]);
    if (activeProducts || activeChildren) throw createError(409, 'CATEGORY_HAS_ACTIVE_CONTENT', 'Move or deactivate active products and subcategories before hiding this category.');
  }
  if (fields.parent && String(fields.parent) === String(existing._id)) {
    throw createError(400, 'VALIDATION_ERROR', 'A category cannot be its own parent.');
  }
  if (fields.parent === null && existing.parent) {
    const canonical = MAIN_CATEGORIES.find((item) => item.slug === existing.slug && item.name === existing.name);
    if (!canonical) throw createError(409, 'TOP_LEVEL_CATEGORY_RESTRICTED', 'Only Plants, Tools, Seeds and Natural Products can be top-level categories.');
  }
  if (fields.parent) {
    const parent = await Category.findById(fields.parent).select('_id isActive archivedAt');
    if (!parent) throw createError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found.');
    if (!parent.isActive || parent.archivedAt) throw createError(409, 'PARENT_CATEGORY_ARCHIVED', 'Parent category must be active.');
    const configuredRoot = await getCategoryRoot(parent._id);
    if (!configuredRoot || !isMainCategorySlug(configuredRoot.slug)) {
      throw createError(409, 'INVALID_CATEGORY_TREE', 'Subcategories must belong to one of the four main catalogue categories.');
    }
    await assertNoParentCycle(existing._id, parent._id);
  }
  const update = { $set: { ...fields } };
  if (fields.image === null) {
    delete update.$set.image;
    update.$unset = { image: 1 };
  }
  const category = await saveOrConflict(
    Category.findByIdAndUpdate(existing._id, update, { returnDocument: 'after', runValidators: true })
  );
  return (await withProductCounts([category]))[0];
}

/** Archive (never delete). Refused while active products still belong to the category. */
export async function archiveCategory(id) {
  const category = await Category.findById(v.objectId(id, 'category id'));
  if (!category) throw notFound();
  if (!category.parent && isMainCategorySlug(category.slug)) {
    throw createError(409, 'MAIN_CATEGORY_PROTECTED', 'A main catalogue category cannot be archived.');
  }
  const activeProducts = await Product.countDocuments({ category: category._id, isActive: true });
  const activeChildren = await Category.countDocuments({ parent: category._id, isActive: true });
  if (activeProducts > 0 || activeChildren > 0) {
    const details = [activeProducts ? `${activeProducts} active product(s)` : null, activeChildren ? `${activeChildren} active subcategory/subcategories` : null].filter(Boolean).join(' and ');
    const err = createError(409, 'CATEGORY_HAS_ACTIVE_CONTENT', `Move or deactivate ${details} before archiving this category.`);
    throw err;
  }
  const archived = await Category.findOneAndUpdate(
    { _id: category._id },
    [{ $set: { isActive: false, archivedAt: { $ifNull: ['$archivedAt', '$$NOW'] } } }],
    { returnDocument: 'after', updatePipeline: true }
  );
  return (await withProductCounts([archived]))[0];
}

export async function restoreCategory(id) {
  const categoryId = v.objectId(id, 'category id');
  const existing = await Category.findById(categoryId);
  if (!existing) throw notFound();
  if (!existing.parent && !MAIN_CATEGORIES.some((item) => item.slug === existing.slug && item.name === existing.name)) {
    throw createError(409, 'TOP_LEVEL_CATEGORY_RESTRICTED', 'Only Plants, Tools, Seeds and Natural Products can be restored as top-level categories.');
  }
  if (existing.parent) {
    const parent = await Category.findById(existing.parent).select('isActive archivedAt');
    if (!parent?.isActive || parent.archivedAt) throw createError(409, 'PARENT_CATEGORY_ARCHIVED', 'Restore or activate the parent category first.');
    if (!(await getCategoryRoot(parent._id))) throw createError(409, 'INVALID_CATEGORY_TREE', 'Only subcategories beneath the four canonical roots can be restored.');
  }
  const category = await Category.findByIdAndUpdate(
    categoryId,
    { $set: { isActive: true, archivedAt: null } },
    { returnDocument: 'after' }
  );
  if (!category) throw notFound();
  return (await withProductCounts([category]))[0];
}

/** What deleting a category would involve (read-only). Deletion is only possible when it is empty. */
export async function getCategoryDeletion(id) {
  const category = await Category.findById(v.objectId(id, 'category id')).select('_id name slug parent');
  if (!category) throw notFound();
  const [products, children] = await Promise.all([
    Product.countDocuments({ category: category._id }),
    Category.countDocuments({ parent: category._id }),
  ]);
  const protectedRoot = !category.parent && isMainCategorySlug(category.slug);
  return {
    category: { id: String(category._id), name: category.name, slug: category.slug },
    references: { products, children },
    canDelete: !protectedRoot && products === 0 && children === 0,
    message: protectedRoot ? 'Canonical catalogue roots cannot be deleted.' : deletionBlockedMessage(products, children) ?? 'This category is empty and can be deleted permanently.',
  };
}

function deletionBlockedMessage(products, children) {
  const parts = [];
  if (products > 0) parts.push(`${products} product(s) (including archived ones)`);
  if (children > 0) parts.push(`${children} subcategor${children === 1 ? 'y' : 'ies'}`);
  if (parts.length === 0) return null;
  return `This category still has ${parts.join(' and ')}. Move them to another category (edit each product or subcategory) or delete them first. To hide the category without deleting, archive it instead.`;
}

/**
 * Permanently delete an EMPTY category (no products â€” archived ones included â€” and no
 * subcategories). Requires `{ confirmSlug }` equal to the category slug. Products are never
 * deleted or reassigned here.
 */
export async function deleteCategory(id, body) {
  const categoryId = v.objectId(id, 'category id');
  v.requireBody(body ?? {}, ['confirmSlug']);
  const confirmSlug = typeof body?.confirmSlug === 'string' ? body.confirmSlug.trim() : '';
  return withOptionalTransaction(async (session) => {
    const category = await Category.findById(categoryId).select('_id name slug parent').session(session);
    if (!category) throw notFound();
    if (!category.parent && isMainCategorySlug(category.slug)) throw createError(409, 'MAIN_CATEGORY_PROTECTED', 'Canonical catalogue roots cannot be deleted.');
    if (!confirmSlug || confirmSlug !== category.slug) {
      throw createError(400, 'CONFIRMATION_REQUIRED', 'Confirm the deletion by sending the category slug as confirmSlug.');
    }
    // Sequential on purpose: operations sharing a transaction session must not run in parallel.
    const products = await Product.countDocuments({ category: category._id }).session(session);
    const children = await Category.countDocuments({ parent: category._id }).session(session);
    const blocked = deletionBlockedMessage(products, children);
    if (blocked) throw createError(409, 'CATEGORY_NOT_EMPTY', blocked);
    const removed = await Category.deleteOne({ _id: category._id }, session ? { session } : {});
    if (removed.deletedCount !== 1) throw notFound();
    return { deleted: { id: String(category._id), name: category.name, slug: category.slug } };
  });
}

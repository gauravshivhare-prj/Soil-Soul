import { Category } from './category.model.js';
import { Product } from '../products/product.model.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError, toDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import * as v from '../../utils/input.js';

const EDITABLE = ['name', 'shortName', 'tagline', 'description', 'image', 'displayOrder', 'isActive'];
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
  const ids = categories.map((c) => c._id);
  const counts = await Product.aggregate([
    { $match: { category: { $in: ids } } },
    { $group: { _id: '$category', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c]));
  return categories.map((c) => ({
    ...c.toJSON(),
    productCount: byId.get(String(c._id))?.total ?? 0,
    activeProductCount: byId.get(String(c._id))?.active ?? 0,
  }));
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
    Category.find(filter).sort({ displayOrder: 1, name: 1 }).skip(skip).limit(limit),
    Category.countDocuments(filter),
  ]);
  return {
    categories: await withProductCounts(categories),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getCategoryAdmin(id) {
  const category = await Category.findById(v.objectId(id, 'category id'));
  if (!category) throw notFound();
  return (await withProductCounts([category]))[0];
}

export async function createCategory(body) {
  v.requireBody(body, ['slug', ...EDITABLE]);
  const fields = readFields(body, { creating: true });
  const slug = v.slug(body.slug ?? fields.name, 'Slug', { max: 80 });
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
  if (existing.archivedAt && fields.isActive === true) {
    throw createError(409, 'CATEGORY_ARCHIVED', 'Restore the archived category before activating it.');
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
  const activeProducts = await Product.countDocuments({ category: category._id, isActive: true });
  if (activeProducts > 0) {
    const err = createError(409, 'CATEGORY_HAS_ACTIVE_PRODUCTS', `Archive or move the ${activeProducts} active product(s) in this category first.`);
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
  const category = await Category.findByIdAndUpdate(
    v.objectId(id, 'category id'),
    { $set: { isActive: true, archivedAt: null } },
    { returnDocument: 'after' }
  );
  if (!category) throw notFound();
  return (await withProductCounts([category]))[0];
}

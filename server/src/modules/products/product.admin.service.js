import { Product } from './product.model.js';
import { Category } from '../categories/category.model.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError, toDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import { withOptionalTransaction } from '../../utils/transaction.js';
import { recordMovement } from '../inventory/inventory.service.js';
import * as v from '../../utils/input.js';

/**
 * Admin product management. Stock is set once at creation; afterwards it changes only through
 * inventory adjustments and orders (so every change has a history record). rating, reviewCount
 * and soldCount are system-managed and never writable here.
 */

const EDITABLE = [
  'name', 'sku', 'summary', 'description', 'categoryId', 'price', 'mrp', 'images', 'tags',
  'status', 'isFeatured', 'isActive', 'light', 'size', 'highlights', 'care', 'specs', 'options',
];
const CREATE_ONLY = ['slug', 'stock'];
const STATUS_FILTERS = ['all', 'active', 'draft', 'inactive', 'archived'];
const SORTS = Object.freeze({
  newest: { createdAt: -1 },
  name: { name: 1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'stock-asc': { stock: 1 },
});

const notFound = () => createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

function signedMoney(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1_000_000) {
    throw createError(400, 'VALIDATION_ERROR', `${label} must be an amount between -1000000 and 1000000.`);
  }
  return v.money(Math.abs(value), label, { max: 1_000_000 }) * Math.sign(value) || 0;
}

function readOptions(value) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw createError(400, 'VALIDATION_ERROR', 'options must be { label, choices }.');
  v.requireBody(value, ['label', 'choices']);
  const label = v.text(value.label, 'Options label', { min: 1, max: 40 });
  const ids = new Set();
  const choices = v.list(value.choices, 'Option choices', {
    max: 10,
    item: (choice, l) => {
      if (!choice || typeof choice !== 'object' || Array.isArray(choice)) throw createError(400, 'VALIDATION_ERROR', `${l} must be an object.`);
      v.requireBody(choice, ['id', 'name', 'detail', 'priceDelta', 'sku', 'price', 'mrp', 'stock', 'weight', 'volume', 'attributes', 'isActive']);
      const id = v.slug(choice.id, `${l} id`, { max: 40 });
      if (ids.has(id)) throw createError(400, 'VALIDATION_ERROR', `${l} id is duplicated.`);
      ids.add(id);
      return {
        id,
        name: v.text(choice.name, `${l} name`, { min: 1, max: 60 }),
        detail: v.text(choice.detail, `${l} detail`, { max: 120 }) || undefined,
        priceDelta: choice.priceDelta === undefined ? 0 : signedMoney(choice.priceDelta, `${l} price change`),
        sku: choice.sku ? v.text(choice.sku, `${l} SKU`, { min: 2, max: 40 }).toUpperCase() : undefined,
        price: choice.price === undefined || choice.price === null || choice.price === '' ? null : v.money(choice.price, `${l} price`),
        mrp: choice.mrp === undefined || choice.mrp === null || choice.mrp === '' ? null : v.money(choice.mrp, `${l} MRP`),
        stock: choice.stock === undefined || choice.stock === null || choice.stock === '' ? null : v.integer(choice.stock, `${l} stock`, { min: 0, max: 100000 }),
        weight: choice.weight ? v.text(choice.weight, `${l} weight`, { max: 40 }) : undefined,
        volume: choice.volume ? v.text(choice.volume, `${l} volume`, { max: 40 }) : undefined,
        attributes: choice.attributes && typeof choice.attributes === 'object' && !Array.isArray(choice.attributes)
          ? Object.fromEntries(Object.entries(choice.attributes).map(([key, val]) => [v.slug(key, `${l} attribute`, { max: 30 }), v.text(val, `${l} attribute value`, { min: 1, max: 60 })]))
          : undefined,
        isActive: choice.isActive === undefined ? true : v.boolean(choice.isActive, `${l} active flag`),
      };
    },
  });
  if (choices.length === 0) throw createError(400, 'VALIDATION_ERROR', 'Options need at least one choice.');
  return { label, choices };
}

function readFields(body, { creating }) {
  const out = {};
  if (creating || 'name' in body) out.name = v.text(body.name, 'Name', { min: 2, max: 120 });
  if ('sku' in body) out.sku = body.sku === null || body.sku === '' ? null : v.text(body.sku, 'SKU', { min: 2, max: 40 }).toUpperCase();
  if ('summary' in body) out.summary = v.text(body.summary, 'Summary', { max: 300 });
  if ('description' in body) out.description = v.text(body.description, 'Description', { max: 5000 });
  if (creating || 'price' in body) out.price = body.price === null || body.price === '' ? null : v.money(body.price, 'Price', { max: 1_000_000 });
  if ('mrp' in body) out.mrp = body.mrp === null ? null : v.money(body.mrp, 'MRP', { max: 1_000_000 });
  if ('images' in body) {
    out.images = v.list(body.images, 'Images', { max: 10, item: (img, l) => v.image(img, l) });
    const primaryCount = out.images.filter((img) => img.isPrimary).length;
    if (primaryCount > 1) throw createError(400, 'VALIDATION_ERROR', 'Only one image can be primary.');
    // Exactly one primary image: the one marked primary, otherwise the first.
    const primaryIndex = primaryCount === 1 ? out.images.findIndex((img) => img.isPrimary) : 0;
    out.images = out.images.map((img, index) => ({ ...img, sortOrder: img.sortOrder ?? index, isPrimary: index === primaryIndex }));
  }
  if ('tags' in body) out.tags = v.list(body.tags, 'Tags', { max: 20, item: (t, l) => v.text(t, l, { min: 1, max: 40 }).toLowerCase() });
  if ('isFeatured' in body) out.isFeatured = v.boolean(body.isFeatured, 'isFeatured');
  if ('isActive' in body) out.isActive = v.boolean(body.isActive, 'isActive');
  if ('light' in body) out.light = body.light === null ? null : v.oneOf(body.light, 'light', ['low', 'bright-indirect', 'full-sun']);
  if ('size' in body) out.size = body.size === null ? null : v.oneOf(body.size, 'size', ['small', 'medium', 'large']);
  if ('highlights' in body) out.highlights = v.list(body.highlights, 'Highlights', { max: 10, item: (h, l) => v.text(h, l, { min: 1, max: 200 }) });
  if ('care' in body) {
    out.care = v.list(body.care, 'Care', {
      max: 10,
      item: (c, l) => {
        v.requireBody(c, ['title', 'text']);
        return { title: v.text(c.title, `${l} title`, { min: 1, max: 80 }), text: v.text(c.text, `${l} text`, { min: 1, max: 500 }) };
      },
    });
  }
  if ('specs' in body) {
    out.specs = v.list(body.specs, 'Specs', {
      max: 20,
      item: (s, l) => {
        v.requireBody(s, ['label', 'value']);
        return { label: v.text(s.label, `${l} label`, { min: 1, max: 60 }), value: v.text(s.value, `${l} value`, { min: 1, max: 200 }) };
      },
    });
  }
  if ('options' in body) out.options = readOptions(body.options);
  if ('status' in body) out.status = v.oneOf(body.status, 'status', ['draft', 'active', 'inactive']);
  return out;
}

function checkMrp(price, mrp) {
  if (mrp !== null && mrp !== undefined && mrp < price) {
    throw createError(400, 'VALIDATION_ERROR', 'MRP cannot be lower than the price.');
  }
}

async function activeCategory(categoryId) {
  const category = await Category.findById(v.objectId(categoryId, 'category id')).select('_id slug isActive archivedAt');
  if (!category) throw createError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  if (category.archivedAt) throw createError(409, 'CATEGORY_ARCHIVED', 'Products cannot be added to an archived category.');
  return category;
}

const adminView = (product) => {
  const json = product.toJSON();
  json.category = product.category?._id ? String(product.category._id) : String(product.category);
  return json;
};

async function conflictSafe(promise) {
  try {
    return await promise;
  } catch (err) {
    if (isDuplicateKeyError(err)) throw toDuplicateKeyError(err);
    throw err;
  }
}

/** All products for admins (any status), with search, filters, allowlisted sort and pagination. */
export async function listProductsAdmin(query = {}) {
  const { page, limit, skip } = v.pagination(query, { defaultLimit: 20, maxLimit: 100 });
  const status = query.status === undefined ? 'all' : v.oneOf(query.status, 'status', STATUS_FILTERS);
  const sort = query.sort === undefined ? 'newest' : v.oneOf(query.sort, 'sort', Object.keys(SORTS));
  const filter = {};
  // Same visibility rule as the storefront: shown only when active, status "active" and not archived.
  if (status === 'active') Object.assign(filter, { isActive: true, status: { $in: ['active', null] }, archivedAt: null });
  if (status === 'draft') Object.assign(filter, { status: 'draft', archivedAt: null });
  if (status === 'inactive') {
    Object.assign(filter, { archivedAt: null, status: { $ne: 'draft' }, $and: [{ $or: [{ isActive: false }, { status: 'inactive' }] }] });
  }
  if (status === 'archived') filter.archivedAt = { $ne: null };
  if (query.category !== undefined) filter.category = v.objectId(query.category, 'category id');
  if (query.q !== undefined) {
    const q = v.text(query.q, 'Search', { max: 100 });
    if (q) {
      const rx = v.escapeRegex(q);
      filter.$or = [{ name: { $regex: rx, $options: 'i' } }, { slug: { $regex: rx, $options: 'i' } }, { sku: { $regex: rx, $options: 'i' } }];
    }
  }
  const [products, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort]).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  return { products: products.map(adminView), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getProductAdmin(id) {
  const product = await Product.findById(v.objectId(id, 'product id'));
  if (!product) throw notFound();
  return adminView(product);
}

/** Create a product; its initial stock is recorded as an 'initial' stock movement. */
export async function createProduct(body, actorId) {
  v.requireBody(body, [...EDITABLE, ...CREATE_ONLY]);
  const fields = readFields(body, { creating: true });
  const status = fields.status ?? 'active';
  if (!('categoryId' in body)) throw createError(400, 'VALIDATION_ERROR', 'categoryId is required.');
  const stock = body.stock === undefined || body.stock === null ? null : v.integer(body.stock, 'Stock', { min: 0, max: 100000 });
  if (status !== 'draft' && fields.price === null) throw createError(400, 'VALIDATION_ERROR', 'Active products require a price.');
  if (fields.price !== null) checkMrp(fields.price, fields.mrp);
  const category = await activeCategory(body.categoryId);
  const slug = v.slug(body.slug ?? fields.name, 'Slug', { max: 140 });
  const doc = { ...fields, status, slug, stock, category: category._id, categorySlug: category.slug };
  for (const key of ['sku', 'mrp', 'options']) if (doc[key] === null) delete doc[key];

  const product = await conflictSafe(
    withOptionalTransaction(async (session) => {
      const [created] = await Product.create([doc], session ? { session } : {});
      if (stock > 0) {
        await recordMovement({ product: created._id, delta: stock, stockAfter: stock, reason: 'initial', actor: actorId }, session);
      }
      return created;
    })
  );
  return adminView(product);
}

/** Update editable fields. The slug and stock are not editable here. */
export async function updateProduct(id, body) {
  v.requireBody(body, EDITABLE);
  if (Object.keys(body).length === 0) throw createError(400, 'VALIDATION_ERROR', 'Provide at least one field to update.');
  const fields = readFields(body, { creating: false });
  const existing = await Product.findById(v.objectId(id, 'product id'));
  if (!existing) throw notFound();
  if (existing.archivedAt && fields.isActive === true) {
    throw createError(409, 'PRODUCT_ARCHIVED', 'Restore the archived product before activating it.');
  }
  const nextStatus = fields.status ?? existing.status ?? (fields.isActive === false ? 'inactive' : 'active');
  // An explicit `price: null` must be validated as null (not fall back to the stored price).
  const nextPrice = 'price' in fields ? fields.price : existing.price;
  if (nextStatus !== 'draft' && nextPrice === null) throw createError(400, 'VALIDATION_ERROR', 'Active products require a price.');
  if (nextPrice !== null) checkMrp(nextPrice, 'mrp' in fields ? fields.mrp : existing.mrp);
  if ('categoryId' in body) {
    const category = await activeCategory(body.categoryId);
    fields.category = category._id;
    fields.categorySlug = category.slug;
  }

  const $set = {};
  const $unset = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null && ['sku', 'mrp', 'options'].includes(key)) $unset[key] = 1;
    else $set[key] = value;
  }
  const update = { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
  const product = await conflictSafe(Product.findByIdAndUpdate(existing._id, update, { returnDocument: 'after', runValidators: true }));
  return adminView(product);
}

/** Archive (never delete): hidden from the store and not purchasable; past orders are untouched. */
export async function archiveProduct(id) {
  const product = await Product.findOneAndUpdate(
    { _id: v.objectId(id, 'product id') },
    [{ $set: { isActive: false, archivedAt: { $ifNull: ['$archivedAt', '$$NOW'] } } }],
    { returnDocument: 'after', updatePipeline: true }
  );
  if (!product) throw notFound();
  return adminView(product);
}

/** Restore an archived product; its category must be active. */
export async function restoreProduct(id) {
  const existing = await Product.findById(v.objectId(id, 'product id'));
  if (!existing) throw notFound();
  const category = await Category.findById(existing.category).select('isActive archivedAt');
  if (!category || category.archivedAt || !category.isActive) {
    throw createError(409, 'CATEGORY_INACTIVE', 'Restore or activate the product category first.');
  }
  const product = await Product.findByIdAndUpdate(existing._id, { $set: { isActive: true, archivedAt: null } }, { returnDocument: 'after' });
  return adminView(product);
}

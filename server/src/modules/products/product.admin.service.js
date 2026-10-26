import { Product } from './product.model.js';
import { Category } from '../categories/category.model.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError, toDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import { withOptionalTransaction } from '../../utils/transaction.js';
import { recordMovement, recordMovementSafely } from '../inventory/inventory.service.js';
import * as v from '../../utils/input.js';
import { Order } from '../orders/order.model.js';
import { Cart } from '../cart/cart.model.js';
import { StockMovement } from '../inventory/stockMovement.model.js';
import { MISSING_IMAGE_FILTER, hasUsableImage } from './imageUsability.js';

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
  json.hasUsableImage = hasUsableImage(product);
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
  // image=missing: no usable image (empty, no valid source, or only verified placeholders).
  if (query.image !== undefined) {
    const image = v.oneOf(query.image, 'image', ['missing', 'usable']);
    if (image === 'missing') Object.assign(filter, MISSING_IMAGE_FILTER);
    else filter.$nor = [MISSING_IMAGE_FILTER];
  }
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
      for (const choice of created.options?.choices ?? []) {
        if (choice.stock > 0) {
          await recordMovement(
            { product: created._id, optionId: choice.id, delta: choice.stock, stockAfter: choice.stock, reason: 'initial', actor: actorId },
            session
          );
        }
      }
      return created;
    })
  );
  return adminView(product);
}

/**
 * Variants as submitted, but with stock taken from the stored product for variants that already
 * exist: their stock changes only through Inventory adjustments and orders (each with a history
 * record). Variants new to the product keep the submitted opening stock.
 * @returns {{ options: Object|null, added: Array<{ id: string, stock: number }> }}
 */
function mergeVariantStock(submitted, current) {
  if (!submitted) return { options: submitted, added: [] };
  const stored = new Map((current?.options?.choices ?? []).map((c) => [c.id, c]));
  const added = [];
  const choices = submitted.choices.map((choice) => {
    if (stored.has(choice.id)) return { ...choice, stock: stored.get(choice.id).stock ?? null };
    if (choice.stock > 0) added.push({ id: choice.id, stock: choice.stock });
    return choice;
  });
  return { options: { ...submitted, choices }, added };
}

/** Matches only while every stored variant still has the stock it had when it was read. */
function unchangedVariantStock(current) {
  const choices = current?.options?.choices ?? [];
  if (choices.length === 0) return {};
  return { $and: choices.map((c) => ({ 'options.choices': { $elemMatch: { id: c.id, stock: c.stock ?? null } } })) };
}

/** Update editable fields. The slug and stock (product or existing variants) are not editable here. */
export async function updateProduct(id, body, actorId = null) {
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

  // Variant stock can change at any moment (checkout, cancellations, Inventory). When variants are
  // saved, the update only applies if no variant stock changed since it was read; otherwise it is
  // rebuilt from fresh data and retried, so a form save can never restore stock that was sold.
  const touchesVariants = 'options' in fields;
  let current = existing;
  for (let attempt = 0; attempt < 3; attempt++) {
    const merged = touchesVariants ? mergeVariantStock(fields.options, current) : { added: [] };
    const next = touchesVariants ? { ...fields, options: merged.options } : fields;
    const $set = {};
    const $unset = {};
    for (const [key, value] of Object.entries(next)) {
      if (value === null && ['sku', 'mrp', 'options'].includes(key)) $unset[key] = 1;
      else $set[key] = value;
    }
    const update = { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
    const filter = { _id: existing._id, ...(touchesVariants ? unchangedVariantStock(current) : {}) };
    const product = await conflictSafe(Product.findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true }));
    if (product) {
      for (const variant of merged.added) {
        await recordMovementSafely({ product: product._id, optionId: variant.id, delta: variant.stock, stockAfter: variant.stock, reason: 'initial', actor: actorId });
      }
      return adminView(product);
    }
    current = await Product.findById(existing._id);
    if (!current) throw notFound();
  }
  throw createError(409, 'STOCK_CHANGED', 'Stock changed while saving. Please try again.');
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

/** Orders that reference a product (order lines, or stock-restoration records of cancellations). */
const orderReference = (productId) => ({ $or: [{ 'items.product': productId }, { 'cancellation.restorationErrors.productId': productId }] });

/**
 * What deleting a product would involve, without changing anything. Permanent deletion is only
 * possible for a product without a usable image that no order references; otherwise archive it.
 */
export async function getProductDeletion(id) {
  const product = await Product.findById(v.objectId(id, 'product id')).select('_id name slug images archivedAt');
  if (!product) throw notFound();
  const [orders, carts, stockHistory] = await Promise.all([
    Order.countDocuments(orderReference(product._id)),
    Cart.countDocuments({ 'items.product': product._id }),
    StockMovement.countDocuments({ product: product._id }),
  ]);
  const usable = hasUsableImage(product);
  const blockedBy = usable ? 'HAS_USABLE_IMAGE' : orders > 0 ? 'HAS_ORDERS' : null;
  return {
    product: { id: String(product._id), name: product.name, slug: product.slug, archived: Boolean(product.archivedAt) },
    hasUsableImage: usable,
    references: { orders, carts, stockHistory },
    canDelete: blockedBy === null,
    blockedBy,
    message:
      blockedBy === 'HAS_USABLE_IMAGE'
        ? 'This product has a usable image. Only products without a usable image can be deleted; archive it to hide it from the shop.'
        : blockedBy === 'HAS_ORDERS'
          ? `This product appears in ${orders} order(s). Deleting it would break order history, so archive it instead.`
          : `Deleting removes the product permanently${carts ? ` and takes it out of ${carts} customer cart(s)` : ''}. Stock history records are kept.`,
  };
}

/**
 * Permanently delete one product without a usable image that no order references. Requires
 * `{ confirmSlug }` equal to the product's slug (an explicit confirmation; never bulk). Its lines
 * are removed from carts; stock history is kept as an audit trail. Categories, users and orders are
 * never touched.
 */
export async function deleteProduct(id, body) {
  const productId = v.objectId(id, 'product id');
  v.requireBody(body ?? {}, ['confirmSlug']);
  const confirmSlug = typeof body?.confirmSlug === 'string' ? body.confirmSlug.trim() : '';

  return withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    const product = await Product.findById(productId).select('_id name slug images updatedAt').session(session);
    if (!product) throw notFound();
    if (!confirmSlug || confirmSlug !== product.slug) {
      throw createError(400, 'CONFIRMATION_REQUIRED', 'Confirm the deletion by sending the product slug as confirmSlug.');
    }
    if (hasUsableImage(product)) {
      throw createError(409, 'PRODUCT_HAS_IMAGES', 'Only products without a usable image can be deleted. Archive this product instead.');
    }
    const orders = await Order.countDocuments(orderReference(product._id)).session(session);
    if (orders > 0) {
      throw createError(409, 'PRODUCT_HAS_ORDERS', `This product appears in ${orders} order(s); archive it instead so order history stays intact.`);
    }
    // Delete only while it still has no usable image and is unchanged since it was read (both
    // re-checked atomically): a sale, stock change or edit during the checks makes the delete fail
    // instead of acting on stale data. Inside a transaction a concurrent write also conflicts.
    const removed = await Product.deleteOne({ _id: product._id, updatedAt: product.updatedAt, ...MISSING_IMAGE_FILTER }, opts);
    if (removed.deletedCount !== 1) {
      throw createError(409, 'PRODUCT_CHANGED', 'The product changed while deleting (for example a new image, a sale or a stock change). Reload and try again.');
    }
    // Take it out of carts (bumping the version so a checkout in progress notices the change).
    const carts = await Cart.updateMany({ 'items.product': product._id }, { $pull: { items: { product: product._id } }, $inc: { __v: 1 } }, opts);
    return { deleted: { id: String(product._id), name: product.name, slug: product.slug }, removedFromCarts: carts.modifiedCount };
  });
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

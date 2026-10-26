import { Product } from '../products/product.model.js';
import { StockMovement, ADMIN_ADJUSTMENT_REASONS, MOVEMENT_REASONS } from './stockMovement.model.js';
import { createError } from '../../utils/createError.js';
import { logError } from '../../utils/logError.js';
import { withOptionalTransaction } from '../../utils/transaction.js';
import * as v from '../../utils/input.js';
import { isLiveProduct, stockLevel, stockUnits } from './stockUnits.js';

/**
 * Write one stock-history record. Records with an opKey are exactly-once: a duplicate opKey
 * means the operation was already recorded and is ignored.
 */
export async function recordMovement(movement, session = null) {
  try {
    await StockMovement.create([movement], session ? { session } : {});
  } catch (err) {
    if (err?.code === 11000 && movement.opKey) return;
    throw err;
  }
}

/**
 * Best-effort history write for flows whose stock change has already happened outside a
 * transaction (standalone deployments). Failures are logged, never thrown, so they cannot undo
 * a completed order or cancellation; the gap is visible in the logs.
 */
export async function recordMovementSafely(movement, session = null) {
  try {
    await recordMovement(movement, session);
  } catch (err) {
    if (session) throw err;
    logError('[inventory:movement_not_recorded]', err);
  }
}

/** Variant ids are slugs (see readOptions); the strict pattern also keeps them safe inside pipelines. */
function readOptionId(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 40 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw createError(400, 'VALIDATION_ERROR', 'A valid variant id is required.');
  }
  return value;
}

/** Atomic stock change for the product-level stock or one variant (a stock that is not set counts as 0). */
function stockChange(productId, optionId, delta, { guard }) {
  if (!optionId) {
    return {
      filter: { _id: productId, ...(guard && delta < 0 ? { stock: { $gte: -delta } } : {}) },
      update: [{ $set: { stock: { $add: [{ $ifNull: ['$stock', 0] }, delta] } } }],
    };
  }
  return {
    filter: { _id: productId, 'options.choices': { $elemMatch: { id: optionId, ...(guard && delta < 0 ? { stock: { $gte: -delta } } : {}) } } },
    update: [
      {
        $set: {
          'options.choices': {
            $map: {
              input: '$options.choices',
              as: 'c',
              in: {
                $cond: [
                  { $eq: ['$$c.id', { $literal: optionId }] },
                  { $mergeObjects: ['$$c', { stock: { $add: [{ $ifNull: ['$$c.stock', 0] }, delta] } }] },
                  '$$c',
                ],
              },
            },
          },
        },
      },
    ],
  };
}

/**
 * Admin stock adjustment for a product or, with `optionId`, one of its variants: one atomic
 * conditional update (stock never below 0) plus its history record — in one transaction when
 * supported; on standalone the stock change is reverted if the history record cannot be written.
 * Adjusting a variant that has no stock of its own yet starts tracking stock on that variant.
 */
export async function adjustStock(body, actorId) {
  v.requireBody(body, ['productId', 'optionId', 'delta', 'reason', 'note']);
  const productId = v.objectId(body.productId, 'product id');
  const optionId = readOptionId(body.optionId);
  const delta = v.integer(body.delta, 'delta', { min: -100000, max: 100000 });
  if (delta === 0) throw createError(400, 'VALIDATION_ERROR', 'delta must not be zero.');
  const reason = v.oneOf(body.reason, 'reason', ADMIN_ADJUSTMENT_REASONS);
  const note = v.text(body.note, 'Note', { max: 300, required: reason === 'other' }) || null;

  return withOptionalTransaction(async (session) => {
    const opts = { returnDocument: 'after', updatePipeline: true, ...(session ? { session } : {}) };
    const { filter, update } = stockChange(productId, optionId, delta, { guard: true });
    const product = await Product.findOneAndUpdate(filter, update, opts).select('_id name stock options');
    if (!product) {
      const found = await Product.findById(productId).select('_id options').session(session);
      if (!found) throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      if (optionId && !found.options?.choices?.some((c) => c.id === optionId)) {
        throw createError(404, 'VARIANT_NOT_FOUND', 'Variant not found on this product.');
      }
      throw createError(409, 'INSUFFICIENT_STOCK', 'Stock cannot go below zero.');
    }
    const stockAfter = optionId ? (product.options.choices.find((c) => c.id === optionId)?.stock ?? null) : product.stock;
    const movement = { product: product._id, optionId, delta, stockAfter, reason, note, actor: actorId };
    try {
      await recordMovement(movement, session);
    } catch (err) {
      if (!session) {
        const undo = stockChange(product._id, optionId, -delta, { guard: false });
        await Product.updateOne(undo.filter, undo.update, { updatePipeline: true }).catch((e) => logError('[inventory:compensation_failed]', e));
      }
      throw err;
    }
    return {
      product: { id: product._id.toString(), name: product.name, optionId, stock: stockAfter },
      movement: { ...movement, product: product._id.toString() },
    };
  });
}

// The inventory view expands products into stock units in memory; this bounds that work.
const INVENTORY_SCAN_LIMIT = 5000;

/**
 * Stock overview for admins, one row per stock unit (a product, or each of its variants).
 * - all: every unit, including drafts, hidden and archived products (flagged).
 * - low / out: only units on sale (live product, active variant), the same rule as the
 *   dashboard alerts. "out" includes units whose stock was never set.
 */
export async function listInventory(query = {}) {
  const { page, limit, skip } = v.pagination(query, { defaultLimit: 50, maxLimit: 100 });
  const filterName = query.filter === undefined ? 'all' : v.oneOf(query.filter, 'filter', ['all', 'low', 'out']);
  const threshold = query.threshold === undefined ? 5 : v.integer(Number(query.threshold), 'threshold', { min: 1, max: 1000 });
  const products = await Product.find({})
    .sort({ name: 1, _id: 1 })
    .limit(INVENTORY_SCAN_LIMIT + 1)
    .select('_id name slug sku stock isActive status archivedAt categorySlug options')
    .lean();
  const truncated = products.length > INVENTORY_SCAN_LIMIT;

  const rows = [];
  for (const p of products.slice(0, INVENTORY_SCAN_LIMIT)) {
    const live = isLiveProduct(p);
    for (const unit of stockUnits(p)) {
      const level = stockLevel(unit, threshold);
      const onSale = live && unit.variantActive;
      if (filterName !== 'all' && (!onSale || level !== filterName)) continue;
      rows.push({
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        categorySlug: p.categorySlug,
        status: p.status ?? 'active',
        isActive: Boolean(p.isActive),
        archived: Boolean(p.archivedAt),
        live,
        ...unit,
        level,
      });
    }
  }
  // Most urgent first: not set, then lowest stock; then by name and variant.
  rows.sort(
    (a, b) =>
      (a.stock ?? -1) - (b.stock ?? -1) ||
      a.name.localeCompare(b.name) ||
      String(a.optionName ?? '').localeCompare(String(b.optionName ?? ''))
  );

  const total = rows.length;
  return {
    items: rows.slice(skip, skip + limit),
    threshold,
    truncated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

/** Stock history, newest first (optionally for one product and/or one of its variants). */
export async function listMovements(query = {}) {
  const { page, limit, skip } = v.pagination(query, { defaultLimit: 50, maxLimit: 100 });
  const filter = {};
  if (query.productId !== undefined) filter.product = v.objectId(query.productId, 'product id');
  if (query.optionId !== undefined) filter.optionId = query.optionId === '' ? null : readOptionId(query.optionId);
  if (query.reason !== undefined) filter.reason = v.oneOf(query.reason, 'reason', MOVEMENT_REASONS);
  const [movements, total] = await Promise.all([
    StockMovement.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    StockMovement.countDocuments(filter),
  ]);
  return { movements, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

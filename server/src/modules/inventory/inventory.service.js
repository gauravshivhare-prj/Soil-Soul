import { Product } from '../products/product.model.js';
import { StockMovement, ADMIN_ADJUSTMENT_REASONS, MOVEMENT_REASONS } from './stockMovement.model.js';
import { createError } from '../../utils/createError.js';
import { logError } from '../../utils/logError.js';
import { withOptionalTransaction } from '../../utils/transaction.js';
import * as v from '../../utils/input.js';

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

/**
 * Admin stock adjustment: one atomic conditional update (stock never below 0) plus its history
 * record — in one transaction when supported; on standalone the stock change is reverted if the
 * history record cannot be written.
 */
export async function adjustStock(body, actorId) {
  v.requireBody(body, ['productId', 'delta', 'reason', 'note']);
  const productId = v.objectId(body.productId, 'product id');
  const delta = v.integer(body.delta, 'delta', { min: -100000, max: 100000 });
  if (delta === 0) throw createError(400, 'VALIDATION_ERROR', 'delta must not be zero.');
  const reason = v.oneOf(body.reason, 'reason', ADMIN_ADJUSTMENT_REASONS);
  const note = v.text(body.note, 'Note', { max: 300, required: reason === 'other' }) || null;

  return withOptionalTransaction(async (session) => {
    const opts = { returnDocument: 'after', updatePipeline: true, ...(session ? { session } : {}) };
    // Stock may not be set yet (null) on new or draft products: treat it as 0. `$inc` can't apply
    // to null, so this is an atomic pipeline update; removals still require enough stock.
    const product = await Product.findOneAndUpdate(
      { _id: productId, ...(delta < 0 ? { stock: { $gte: -delta } } : {}) },
      [{ $set: { stock: { $add: [{ $ifNull: ['$stock', 0] }, delta] } } }],
      opts
    ).select('_id name stock');
    if (!product) {
      const exists = await Product.exists({ _id: productId }).session(session);
      if (!exists) throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      throw createError(409, 'INSUFFICIENT_STOCK', 'Stock cannot go below zero.');
    }
    const movement = { product: product._id, delta, stockAfter: product.stock, reason, note, actor: actorId };
    try {
      await recordMovement(movement, session);
    } catch (err) {
      if (!session) {
        await Product.updateOne({ _id: product._id }, { $inc: { stock: -delta } }).catch((e) => logError('[inventory:compensation_failed]', e));
      }
      throw err;
    }
    return { product: { id: product._id.toString(), name: product.name, stock: product.stock }, movement: { ...movement, product: product._id.toString() } };
  });
}

/** Stock overview for admins: all, low (≤ threshold) or out-of-stock products. */
export async function listInventory(query = {}) {
  const { page, limit, skip } = v.pagination(query, { defaultLimit: 50, maxLimit: 100 });
  const filterName = query.filter === undefined ? 'all' : v.oneOf(query.filter, 'filter', ['all', 'low', 'out']);
  const threshold = query.threshold === undefined ? 5 : v.integer(Number(query.threshold), 'threshold', { min: 1, max: 1000 });
  const filter = {};
  if (filterName === 'low') filter.stock = { $gt: 0, $lte: threshold };
  if (filterName === 'out') filter.stock = { $lte: 0 };
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ stock: 1, name: 1 }).skip(skip).limit(limit).select('_id name slug sku stock isActive archivedAt categorySlug'),
    Product.countDocuments(filter),
  ]);
  return {
    items: items.map((p) => ({ id: p._id.toString(), name: p.name, slug: p.slug, sku: p.sku ?? null, stock: p.stock, isActive: p.isActive, archived: Boolean(p.archivedAt), categorySlug: p.categorySlug })),
    threshold,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

/** Stock history, newest first. */
export async function listMovements(query = {}) {
  const { page, limit, skip } = v.pagination(query, { defaultLimit: 50, maxLimit: 100 });
  const filter = {};
  if (query.productId !== undefined) filter.product = v.objectId(query.productId, 'product id');
  if (query.reason !== undefined) filter.reason = v.oneOf(query.reason, 'reason', MOVEMENT_REASONS);
  const [movements, total] = await Promise.all([
    StockMovement.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    StockMovement.countDocuments(filter),
  ]);
  return { movements, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

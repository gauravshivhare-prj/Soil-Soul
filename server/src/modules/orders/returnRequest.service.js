import mongoose from 'mongoose';
import env from '../../config/env.js';
import { ReturnRequest } from './returnRequest.model.js';
import { Order } from './order.model.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import { withOptionalTransaction } from '../../utils/transaction.js';

function parseOrderFilter(userId, id) {
  if (typeof id !== 'string' || !id.trim()) throw createError(400, 'VALIDATION_ERROR', 'Order id is required.');
  const clean = id.trim();
  return { user: userId, ...(mongoose.Types.ObjectId.isValid(clean) ? { $or: [{ _id: clean }, { orderNumber: clean.toUpperCase() }] } : { orderNumber: clean.toUpperCase() }) };
}

export async function listCustomerReturns(userId, orderId) {
  const order = await Order.findOne(parseOrderFilter(userId, orderId)).select('_id orderStatus statusHistory');
  if (!order) throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  const returns = await ReturnRequest.find({ order: order._id, user: userId }).sort({ createdAt: -1 });
  return {
    returns: returns.map(toCustomerReturn),
    policy: { enabled: env.returnWindowDays > 0, windowDays: env.returnWindowDays, deliveredAt: order.statusHistory?.find((event) => event.nextStatus === 'DELIVERED')?.changedAt ?? null },
  };
}

export async function createReturnRequest(userId, orderId, { itemIndex, quantity = 1, reason } = {}) {
  if (env.returnWindowDays === 0) throw createError(503, 'RETURN_POLICY_NOT_CONFIGURED', 'Return requests are not enabled until the return window is configured.');
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw createError(400, 'VALIDATION_ERROR', 'Select a valid order item and quantity.');
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) throw createError(400, 'VALIDATION_ERROR', 'Return reason must be 5 to 500 characters.');
  const order = await Order.findOne(parseOrderFilter(userId, orderId));
  if (!order) throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  if (order.orderStatus !== 'DELIVERED') throw createError(409, 'RETURN_NOT_ELIGIBLE', 'Only delivered orders can be returned.');
  if (order.paymentStatus === 'REFUNDED' || order.orderStatus === 'CANCELLED') throw createError(409, 'RETURN_NOT_ELIGIBLE', 'This order has already been processed.');
  const deliveredAt = order.statusHistory?.find((entry) => entry.nextStatus === 'DELIVERED')?.changedAt;
  if (!deliveredAt) throw createError(409, 'RETURN_NOT_ELIGIBLE', 'A delivery date is unavailable for this order. Contact support for help.');
  const expiresAt = new Date(deliveredAt.getTime() + env.returnWindowDays * 86400000);
  if (Date.now() > expiresAt.getTime()) throw createError(409, 'RETURN_WINDOW_EXPIRED', 'The return request window has expired.');
  const item = order.items[itemIndex];
  if (!item || quantity > item.quantity) throw createError(400, 'VALIDATION_ERROR', 'Return quantity exceeds the order item quantity.');
  const prior = await ReturnRequest.aggregate([
    { $match: { order: order._id, itemIndex, status: { $ne: 'REJECTED' } } },
    { $group: { _id: null, quantity: { $sum: '$quantity' } } },
  ]);
  const priorQuantity = prior[0]?.quantity ?? 0;
  const itemPath = `items.${itemIndex}.returnReservedQuantity`;
  const reservedExpression = { $ifNull: [`$${itemPath}`, 0] };
  const baseReservedExpression = { $max: [reservedExpression, priorQuantity] };
  const nextReservedExpression = { $add: [baseReservedExpression, quantity] };
  const reserved = await Order.updateOne({
    _id: order._id,
    user: userId,
    orderStatus: 'DELIVERED',
    $expr: {
      $lte: [nextReservedExpression, { $arrayElemAt: ['$items.quantity', itemIndex] }],
    },
  }, [{ $set: { [itemPath]: nextReservedExpression } }]);
  if (reserved.modifiedCount !== 1) throw createError(409, 'RETURN_QUANTITY_EXHAUSTED', 'The remaining eligible quantity has changed. Reload the order and try again.');
  const now = new Date();
  const reservationId = new mongoose.Types.ObjectId();
  const data = {
    _id: reservationId,
    order: order._id, user: userId, itemIndex, product: item.product ?? null, productName: item.name,
    quantity, amount: Math.round(item.unitPrice * quantity * 100) / 100, amountBasis: 'GROSS_PRE_DISCOUNT', reason: reason.trim(), status: 'REQUESTED',
    refundStatus: order.paymentMethod === 'COD' ? 'PENDING' : 'NOT_APPLICABLE',
    statusHistory: [{ fromStatus: null, toStatus: 'REQUESTED', actor: userId, actorRole: 'customer', reason: reason.trim(), changedAt: now }],
  };
  try { return toCustomerReturn(await ReturnRequest.create(data)); }
  catch (err) {
    // Release only when the reservation record definitely did not persist. If the lookup fails,
    // keeping the quantity reserved is fail-closed and can be reconciled by an administrator.
    const persisted = await ReturnRequest.exists({ _id: reservationId }).catch(() => null);
    if (!persisted) {
      const released = await Order.updateOne({ _id: order._id, [itemPath]: { $gte: quantity } }, { $inc: { [itemPath]: -quantity } }).catch(() => null);
      if (released?.modifiedCount !== 1) throw createError(409, 'RETURN_RESERVATION_RECONCILIATION_REQUIRED', 'The return request could not be confirmed and its quantity reservation needs administrator reconciliation.');
    }
    if (isDuplicateKeyError(err)) throw createError(409, 'RETURN_EXISTS', 'This return request conflicts with an existing request.');
    throw err;
  }
}

export async function listAdminReturns(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25));
  const filter = {};
  if (query.status !== undefined) {
    const status = typeof query.status === 'string' ? query.status.toUpperCase() : '';
    if (!['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED'].includes(status)) throw createError(400, 'VALIDATION_ERROR', 'Return status is invalid.');
    filter.status = status;
  }
  const [returns, total] = await Promise.all([
    ReturnRequest.find(filter).populate('user', 'name email').populate('order', 'orderNumber paymentMethod orderStatus').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ReturnRequest.countDocuments(filter),
  ]);
  return { returns, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function updateReturnStatus(id, { status, reason, adminId } = {}) {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(adminId)) throw createError(400, 'VALIDATION_ERROR', 'Return or administrator id is invalid.');
  const next = typeof status === 'string' ? status.toUpperCase() : '';
  if (!['APPROVED', 'REJECTED', 'RECEIVED'].includes(next)) throw createError(400, 'VALIDATION_ERROR', 'Status must be APPROVED, REJECTED or RECEIVED.');
  const note = typeof reason === 'string' ? reason.trim() : '';
  if (note.length > 500) throw createError(400, 'VALIDATION_ERROR', 'Decision note cannot exceed 500 characters.');
  const record = await ReturnRequest.findById(id);
  if (!record) throw createError(404, 'RETURN_NOT_FOUND', 'Return request not found.');
  const allowed = record.status === 'REQUESTED' ? ['APPROVED', 'REJECTED'] : record.status === 'APPROVED' ? ['RECEIVED'] : [];
  if (!allowed.includes(next)) throw createError(409, 'INVALID_RETURN_TRANSITION', `Cannot move a ${record.status} return to ${next}.`);
  const now = new Date();
  const update = {
    $set: { status: next, ...(next === 'REJECTED' ? { refundStatus: 'NOT_APPLICABLE' } : {}) },
    $push: { statusHistory: { fromStatus: record.status, toStatus: next, actor: adminId, actorRole: 'admin', reason: note || null, changedAt: now } },
  };
  return withOptionalTransaction(async (session) => {
    const saved = await ReturnRequest.findOneAndUpdate({ _id: record._id, status: record.status }, update, { returnDocument: 'after', ...(session ? { session } : {}) });
    if (!saved) throw createError(409, 'INVALID_RETURN_TRANSITION', 'Return status changed concurrently. Reload and try again.');
    if (next === 'REJECTED') {
      const itemPath = `items.${record.itemIndex}.returnReservedQuantity`;
      const released = await Order.updateOne(
        { _id: record.order, [itemPath]: { $gte: record.quantity } },
        { $inc: { [itemPath]: -record.quantity } },
        session ? { session } : {},
      );
      if (released.modifiedCount !== 1) throw createError(409, 'RETURN_RESERVATION_RELEASE_FAILED', 'The rejected return was recorded, but its quantity reservation needs administrator reconciliation.');
    }
    return saved;
  });
}

export async function recordCodRefund(id, { adminId, note } = {}) {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(adminId)) throw createError(400, 'VALIDATION_ERROR', 'Return or administrator id is invalid.');
  if (typeof note !== 'string' || note.trim().length < 3 || note.trim().length > 500) throw createError(400, 'VALIDATION_ERROR', 'A 3 to 500 character bookkeeping note is required.');
  const existing = await ReturnRequest.findById(id).populate('order', 'paymentMethod');
  if (!existing) throw createError(404, 'RETURN_NOT_FOUND', 'Return request not found.');
  if (existing.order?.paymentMethod !== 'COD') throw createError(409, 'REFUND_NOT_RECORDABLE', 'This bookkeeping action is only for COD orders.');
  const result = await ReturnRequest.findOneAndUpdate(
    { _id: id, status: 'RECEIVED', refundStatus: 'PENDING' },
    { $set: { refundStatus: 'RECORDED', refundRecordedAt: new Date(), refundRecordedBy: adminId, refundNote: note.trim() } },
    { returnDocument: 'after' },
  );
  if (!result) throw createError(409, 'REFUND_NOT_RECORDABLE', 'This return has no pending COD bookkeeping entry.');
  return result;
}

function toCustomerReturn(record) {
  const data = typeof record?.toObject === 'function' ? record.toObject() : record;
  return {
    id: String(data._id ?? data.id),
    order: String(data.order?._id ?? data.order),
    itemIndex: data.itemIndex,
    productName: data.productName,
    quantity: data.quantity,
    amount: data.amount,
    amountBasis: data.amountBasis ?? 'GROSS_PRE_DISCOUNT',
    reason: data.reason,
    status: data.status,
    refundStatus: data.refundStatus,
    statusHistory: (data.statusHistory ?? []).map((event) => ({ fromStatus: event.fromStatus, toStatus: event.toStatus, actorRole: event.actorRole, changedAt: event.changedAt, reason: event.actorRole === 'customer' ? event.reason : null })),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

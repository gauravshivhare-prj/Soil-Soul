import { Order } from '../orders/order.model.js';
import { Product } from '../products/product.model.js';
import { ORDER_STATUS } from '../orders/order.transitions.js';
import * as v from '../../utils/input.js';

const RANGES = Object.freeze({ today: null, '7d': 7, '30d': 30 });
export const LOW_STOCK_THRESHOLD = 5;

function rangeStart(range, now) {
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return new Date(now.getTime() - RANGES[range] * 24 * 60 * 60 * 1000);
}

const sumOf = async (pipeline) => (await Order.aggregate(pipeline))[0]?.total ?? 0;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Operational summary from real data only (server-side aggregations, bounded results).
 * Definitions:
 * - orderValue: total of orders placed in the range, excluding cancelled orders (COD, not yet money received).
 * - collectedAmount: total of orders whose COD payment was marked collected (paymentDetails.collectedAt) in the range.
 * - refundedAmount: refund ledger entries recorded in the range (bookkeeping only; no gateway).
 */
export async function getDashboardSummary(query = {}, now = new Date()) {
  const range = query.range === undefined ? '7d' : v.oneOf(query.range, 'range', Object.keys(RANGES));
  const from = rangeStart(range, now);
  const inRange = { $gte: from, $lte: now };

  const [byStatus, ordersInRange, orderValue, collectedAmount, refundedAmount, lowStockCount, outOfStockCount, pendingReconciliation, recent] =
    await Promise.all([
      Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.countDocuments({ createdAt: inRange }),
      sumOf([{ $match: { createdAt: inRange, orderStatus: { $ne: ORDER_STATUS.CANCELLED } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      sumOf([{ $match: { 'paymentDetails.collectedAt': inRange } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      sumOf([
        { $match: { 'refunds.refundedAt': inRange } },
        { $unwind: '$refunds' },
        { $match: { 'refunds.refundedAt': inRange } },
        { $group: { _id: null, total: { $sum: '$refunds.amount' } } },
      ]),
      Product.countDocuments({ isActive: true, stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
      Product.countDocuments({ isActive: true, stock: { $lte: 0 } }),
      Order.countDocuments({ 'cancellation.stockRestorationStatus': { $in: ['PARTIAL', 'FAILED'] } }),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber orderStatus paymentStatus total createdAt user')
        .populate('user', 'name'),
    ]);

  const ordersByStatus = Object.fromEntries(Object.values(ORDER_STATUS).map((s) => [s, 0]));
  for (const row of byStatus) if (row._id in ordersByStatus) ordersByStatus[row._id] = row.count;

  return {
    range,
    from,
    to: now,
    ordersByStatus,
    ordersInRange,
    orderValue: round2(orderValue),
    collectedAmount: round2(collectedAmount),
    refundedAmount: round2(refundedAmount),
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStockCount,
    outOfStockCount,
    pendingReconciliation,
    recentOrders: recent.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      total: o.total,
      createdAt: o.createdAt,
      customerName: o.user?.name ?? null,
    })),
  };
}

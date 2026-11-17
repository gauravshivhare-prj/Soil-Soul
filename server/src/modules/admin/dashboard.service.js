import { Order } from '../orders/order.model.js';
import { Product } from '../products/product.model.js';
import { ReturnRequest } from '../orders/returnRequest.model.js';
import { ORDER_STATUS } from '../orders/order.transitions.js';
import * as v from '../../utils/input.js';
import { countStockAlerts } from '../inventory/stockUnits.js';

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
const sumOfReturns = async (pipeline) => (await ReturnRequest.aggregate(pipeline))[0]?.total ?? 0;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Operational summary from real data only (server-side aggregations, bounded results).
 * Definitions:
 * - orderValue: total of orders placed in the range, excluding cancelled orders.
 * - collectedAmount: total of orders whose COD payment was marked collected in the range.
 * - refundedAmount: total of refund ledger entries and return request refunds in the range.
 * - netRevenue: collectedAmount minus refundedAmount.
 */
export async function getDashboardSummary(query = {}, now = new Date()) {
  const range = query.range === undefined ? '7d' : v.oneOf(query.range, 'range', Object.keys(RANGES));
  const from = rangeStart(range, now);
  const inRange = { $gte: from, $lte: now };

  const [
    byStatus,
    ordersInRange,
    orderValue,
    collectedAmount,
    orderRefundsTotal,
    returnRefundsTotal,
    refundCount,
    pendingReturnsCount,
    liveProducts,
    pendingReconciliation,
    recent,
  ] = await Promise.all([
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
    sumOfReturns([
      { $match: { refundStatus: 'RECORDED', refundRecordedAt: inRange } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    ReturnRequest.countDocuments({ refundStatus: 'RECORDED', refundRecordedAt: inRange }),
    ReturnRequest.countDocuments({ status: 'REQUESTED' }),
    // Stock alerts count stock units (each variant separately) of products on sale; see stockUnits.js.
    Product.find({ isActive: true, archivedAt: null, status: { $in: ['active', null] } }).select('stock isActive status archivedAt options').lean(),
    Order.countDocuments({ 'cancellation.stockRestorationStatus': { $in: ['PARTIAL', 'FAILED'] } }),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber orderStatus paymentStatus total totalRefunded createdAt user')
      .populate('user', 'name'),
  ]);

  const { low: lowStockCount, out: outOfStockCount } = countStockAlerts(liveProducts, LOW_STOCK_THRESHOLD);
  const ordersByStatus = Object.fromEntries(Object.values(ORDER_STATUS).map((s) => [s, 0]));
  for (const row of byStatus) if (row._id in ordersByStatus) ordersByStatus[row._id] = row.count;

  const refundedAmount = round2(Math.max(orderRefundsTotal, returnRefundsTotal));
  const netRevenue = round2(Math.max(0, collectedAmount - refundedAmount));

  return {
    range,
    from,
    to: now,
    ordersByStatus,
    ordersInRange,
    orderValue: round2(orderValue),
    collectedAmount: round2(collectedAmount),
    refundedAmount,
    netRevenue,
    refundCount,
    pendingReturnsCount,
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
      totalRefunded: o.totalRefunded ?? 0,
      createdAt: o.createdAt,
      customerName: o.user?.name ?? null,
    })),
  };
}

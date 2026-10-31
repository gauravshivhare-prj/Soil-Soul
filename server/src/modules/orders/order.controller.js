import * as orderService from './order.service.js';
import { PAYMENT_METHODS_CONFIG } from './payment.strategy.js';
import { toCustomerOrder } from './order.dto.js';
import * as returnService from './returnRequest.service.js';

/**
 * Handle retrieving payment methods list for checkout UI.
 */
export async function getPaymentMethods(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        paymentMethods: PAYMENT_METHODS_CONFIG,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle creating an order from the authenticated user's cart.
 */
export async function createOrder(req, res, next) {
  try {
    const { paymentMethod, deliveryAddress, couponCode } = req.body || {};
    const idempotencyKey =
      req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body?.idempotencyKey ||
      null;

    const result = await orderService.createOrder(req.user.id, {
      paymentMethod,
      deliveryAddress,
      idempotencyKey,
      couponCode,
    });

    const order = result.order || result;
    const statusCode = result.isExisting ? 200 : 201;

    res.status(statusCode).json({
      success: true,
      data: {
        order: toCustomerOrder(order),
        ...(result.warning ? { warning: result.warning } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle fetching authenticated user's order history.
 */
export async function getOrderHistory(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await orderService.getOrderHistory(req.user.id, { page, limit });
    res.status(200).json({
      success: true,
      data: { ...result, orders: result.orders.map(toCustomerOrder) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle fetching single order by ID or orderNumber with ownership verification.
 */
export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(req.user.id, id);
    res.status(200).json({
      success: true,
      data: {
        order: toCustomerOrder(order),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle customer order cancellation.
 */
export async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const result = await orderService.cancelOrder(req.user.id, id, {
      reason,
      actorRole: 'customer',
    });

    const order = result.order || result;

    res.status(200).json({
      success: true,
      data: {
        order: toCustomerOrder(order),
        ...(result.warning ? { warning: result.warning } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerReturns(req, res, next) {
  try { res.status(200).json({ success: true, data: await returnService.listCustomerReturns(req.user.id, req.params.id) }); }
  catch (err) { next(err); }
}

export async function createCustomerReturn(req, res, next) {
  try { res.status(201).json({ success: true, data: { returnRequest: await returnService.createReturnRequest(req.user.id, req.params.id, req.body ?? {}) } }); }
  catch (err) { next(err); }
}

export async function getAdminReturns(req, res, next) {
  try { res.status(200).json({ success: true, data: await returnService.listAdminReturns(req.query) }); }
  catch (err) { next(err); }
}

export async function updateAdminReturn(req, res, next) {
  try { res.status(200).json({ success: true, data: { returnRequest: await returnService.updateReturnStatus(req.params.id, { ...req.body, adminId: req.user.id }) } }); }
  catch (err) { next(err); }
}

export async function recordReturnRefund(req, res, next) {
  try { res.status(200).json({ success: true, data: { returnRequest: await returnService.recordCodRefund(req.params.id, { ...req.body, adminId: req.user.id }) } }); }
  catch (err) { next(err); }
}

/**
 * Handle admin order list retrieval with filtering, search, sorting, and pagination.
 */
export async function getAdminOrders(req, res, next) {
  try {
    const {
      page,
      limit,
      orderStatus,
      paymentStatus,
      paymentMethod,
      restorationStatus,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await orderService.getAdminOrders({
      page,
      limit,
      orderStatus,
      paymentStatus,
      paymentMethod,
      restorationStatus,
      startDate,
      endDate,
      search,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle admin order detail retrieval by ObjectId or orderNumber.
 */
export async function getAdminOrderById(req, res, next) {
  try {
    const { id } = req.params;
    const order = await orderService.getAdminOrderById(id);

    res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle admin order status update.
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { orderStatus, reason } = req.body || {};

    const order = await orderService.updateOrderStatusByAdmin(id, {
      orderStatus,
      reason,
      adminUserId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle admin payment status update (e.g. COD collection on delivery or cash refund).
 */
export async function updatePaymentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { paymentStatus, note, amount, reason } = req.body || {};

    const order = await orderService.updatePaymentStatusByAdmin(id, {
      paymentStatus,
      note,
      amount,
      reason,
      adminUserId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle admin stock reconciliation for a cancelled order.
 */
export async function reconcileOrderStock(req, res, next) {
  try {
    const { id } = req.params;
    const result = await orderService.reconcileStockForOrder(id, {
      adminUserId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: {
        order: result.order,
        message: result.message,
        alreadyCompleted: result.alreadyCompleted || false,
      },
    });
  } catch (err) {
    next(err);
  }
}

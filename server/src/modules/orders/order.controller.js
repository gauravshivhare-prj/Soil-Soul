import * as orderService from './order.service.js';
import { PAYMENT_METHODS_CONFIG } from './payment.strategy.js';

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
    const { paymentMethod, deliveryAddress } = req.body || {};
    const idempotencyKey =
      req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body?.idempotencyKey ||
      null;

    const result = await orderService.createOrder(req.user.id, {
      paymentMethod,
      deliveryAddress,
      idempotencyKey,
    });

    const order = result.order || result;
    const statusCode = result.isExisting ? 200 : 201;

    res.status(statusCode).json({
      success: true,
      data: {
        order,
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
      data: result,
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
        order,
      },
    });
  } catch (err) {
    next(err);
  }
}

import { createError } from '../../utils/createError.js';

/**
 * Valid order statuses in the Soil & Soul domain.
 */
export const ORDER_STATUS = Object.freeze({
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

/**
 * Valid payment statuses in the Soil & Soul domain.
 */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
});

/**
 * State machine transition map defining permitted next states from each order status.
 * Terminal states (DELIVERED, CANCELLED) cannot transition to any other status.
 */
export const PERMITTED_ORDER_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PLACED]: Object.freeze([ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.CONFIRMED]: Object.freeze([ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.PROCESSING]: Object.freeze([ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.SHIPPED]: Object.freeze([ORDER_STATUS.DELIVERED]),
  [ORDER_STATUS.DELIVERED]: Object.freeze([]),
  [ORDER_STATUS.CANCELLED]: Object.freeze([]),
});

/**
 * Terminal order states that preclude further status modifications.
 */
export const TERMINAL_ORDER_STATES = Object.freeze([
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
]);

/**
 * Initial order states in which a customer is permitted to cancel their order.
 * Once an order reaches PROCESSING, SHIPPED, or DELIVERED, customer cancellation is rejected.
 */
export const CUSTOMER_CANCELLABLE_STATES = Object.freeze([
  ORDER_STATUS.PLACED,
  ORDER_STATUS.CONFIRMED,
]);

/**
 * Permitted payment status transitions.
 */
export const PERMITTED_PAYMENT_TRANSITIONS = Object.freeze({
  [PAYMENT_STATUS.PENDING]: Object.freeze([PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED]),
  [PAYMENT_STATUS.PAID]: Object.freeze([PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.REFUNDED]),
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: Object.freeze([PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.REFUNDED]),
  [PAYMENT_STATUS.FAILED]: Object.freeze([]),
  [PAYMENT_STATUS.REFUNDED]: Object.freeze([]),
});

/**
 * Check if a given order status is a terminal state.
 *
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminalOrderState(status) {
  if (!status || typeof status !== 'string') return false;
  return TERMINAL_ORDER_STATES.includes(status.trim().toUpperCase());
}

/**
 * Check if a customer is allowed to cancel an order in the given status.
 *
 * @param {string} status
 * @returns {boolean}
 */
export function canCustomerCancel(status) {
  if (!status || typeof status !== 'string') return false;
  return CUSTOMER_CANCELLABLE_STATES.includes(status.trim().toUpperCase());
}

/**
 * Validate an order status transition against the state machine.
 *
 * @param {string} currentStatus - The order's current status
 * @param {string} nextStatus - The proposed next status
 * @returns {string} The normalized next status
 * @throws {Error} Operational 400 error on invalid or forbidden transition
 */
export function validateOrderTransition(currentStatus, nextStatus) {
  if (!currentStatus || typeof currentStatus !== 'string') {
    throw createError(400, 'VALIDATION_ERROR', 'Current order status is required.');
  }
  if (!nextStatus || typeof nextStatus !== 'string') {
    throw createError(400, 'VALIDATION_ERROR', 'Next order status is required.');
  }

  const cleanCurrent = currentStatus.trim().toUpperCase();
  const cleanNext = nextStatus.trim().toUpperCase();

  const validStatuses = Object.values(ORDER_STATUS);
  if (!validStatuses.includes(cleanCurrent)) {
    throw createError(400, 'VALIDATION_ERROR', `Invalid current order status: "${currentStatus}".`);
  }
  if (!validStatuses.includes(cleanNext)) {
    throw createError(400, 'VALIDATION_ERROR', `Invalid next order status: "${nextStatus}".`);
  }

  if (cleanCurrent === cleanNext) {
    throw createError(400, 'VALIDATION_ERROR', `Order is already in "${cleanNext}" status.`);
  }

  if (isTerminalOrderState(cleanCurrent)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Cannot transition order from terminal status "${cleanCurrent}".`
    );
  }

  const allowedNext = PERMITTED_ORDER_TRANSITIONS[cleanCurrent];
  if (!allowedNext || !allowedNext.includes(cleanNext)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Invalid order status transition from "${cleanCurrent}" to "${cleanNext}".`
    );
  }

  return cleanNext;
}

/**
 * Validate a Cash on Delivery (COD) payment status transition.
 * COD orders must not be marked PAID before delivery.
 *
 * @param {Object} params
 * @param {string} params.currentPaymentStatus - The current payment status
 * @param {string} params.nextPaymentStatus - The proposed next payment status
 * @param {string} params.orderStatus - The order's status (current or target)
 * @returns {string} The normalized next payment status
 * @throws {Error} Operational 400 error on invalid transition
 */
export function validateCODPaymentTransition({ currentPaymentStatus, nextPaymentStatus, orderStatus }) {
  if (!currentPaymentStatus || typeof currentPaymentStatus !== 'string') {
    throw createError(400, 'VALIDATION_ERROR', 'Current payment status is required.');
  }
  if (!nextPaymentStatus || typeof nextPaymentStatus !== 'string') {
    throw createError(400, 'VALIDATION_ERROR', 'Next payment status is required.');
  }

  const cleanCurrent = currentPaymentStatus.trim().toUpperCase();
  const cleanNext = nextPaymentStatus.trim().toUpperCase();
  const cleanOrder = typeof orderStatus === 'string' ? orderStatus.trim().toUpperCase() : null;

  const validPaymentStatuses = Object.values(PAYMENT_STATUS);
  if (!validPaymentStatuses.includes(cleanCurrent)) {
    throw createError(400, 'VALIDATION_ERROR', `Invalid current payment status: "${currentPaymentStatus}".`);
  }
  if (!validPaymentStatuses.includes(cleanNext)) {
    throw createError(400, 'VALIDATION_ERROR', `Invalid next payment status: "${nextPaymentStatus}".`);
  }

  if (cleanCurrent === cleanNext && cleanCurrent !== PAYMENT_STATUS.PARTIALLY_REFUNDED) {
    throw createError(400, 'VALIDATION_ERROR', `Payment is already in "${cleanNext}" status.`);
  }

  const allowedNext = PERMITTED_PAYMENT_TRANSITIONS[cleanCurrent];
  if (!allowedNext || !allowedNext.includes(cleanNext)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Invalid payment status transition from "${cleanCurrent}" to "${cleanNext}".`
    );
  }

  // Strict COD Rule: Cannot mark as PAID before delivery
  if (cleanNext === PAYMENT_STATUS.PAID && cleanOrder !== ORDER_STATUS.DELIVERED) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      'Cash on Delivery (COD) orders cannot be marked as PAID before delivery.'
    );
  }

  return cleanNext;
}

/**
 * Validate order lifecycle updates with actor-based permissions and stock action determination.
 *
 * @param {Object} params
 * @param {string} params.currentOrderStatus
 * @param {string} [params.nextOrderStatus]
 * @param {string} params.currentPaymentStatus
 * @param {string} [params.nextPaymentStatus]
 * @param {string} [params.paymentMethod='COD']
 * @param {string} [params.actorRole='customer']
 * @returns {Object} { orderStatus, paymentStatus, stockAction: 'RESTORE' | 'NONE' }
 */
export function validateOrderLifecycleUpdate({
  currentOrderStatus,
  nextOrderStatus,
  currentPaymentStatus,
  nextPaymentStatus,
  paymentMethod = 'COD',
  actorRole = 'customer',
}) {
  const isCustomer = actorRole === 'customer';
  let resolvedOrderStatus = currentOrderStatus;
  let resolvedPaymentStatus = currentPaymentStatus;
  let stockAction = 'NONE';

  // Customer restrictions
  if (isCustomer) {
    if (nextPaymentStatus !== undefined && nextPaymentStatus !== null && nextPaymentStatus !== currentPaymentStatus) {
      throw createError(403, 'FORBIDDEN', 'Customers are not permitted to modify payment status.');
    }

    if (nextOrderStatus !== undefined && nextOrderStatus !== null) {
      const cleanNext = nextOrderStatus.trim().toUpperCase();
      if (cleanNext !== ORDER_STATUS.CANCELLED) {
        throw createError(400, 'VALIDATION_ERROR', 'Customers may only request order cancellation.');
      }
      if (!canCustomerCancel(currentOrderStatus)) {
        throw createError(
          400,
          'VALIDATION_ERROR',
          `Order cannot be cancelled in its current status ("${currentOrderStatus}").`
        );
      }
      resolvedOrderStatus = validateOrderTransition(currentOrderStatus, cleanNext);
      stockAction = 'RESTORE';
    }
  } else {
    // Admin transitions
    if (nextOrderStatus !== undefined && nextOrderStatus !== null && nextOrderStatus !== currentOrderStatus) {
      resolvedOrderStatus = validateOrderTransition(currentOrderStatus, nextOrderStatus);
      if (resolvedOrderStatus === ORDER_STATUS.CANCELLED) {
        stockAction = 'RESTORE';
      }
    }

    if (
      nextPaymentStatus !== undefined &&
      nextPaymentStatus !== null &&
      (nextPaymentStatus !== currentPaymentStatus || currentPaymentStatus === PAYMENT_STATUS.PARTIALLY_REFUNDED)
    ) {
      if (paymentMethod === 'COD') {
        resolvedPaymentStatus = validateCODPaymentTransition({
          currentPaymentStatus,
          nextPaymentStatus,
          orderStatus: resolvedOrderStatus,
        });
      } else {
        const allowedNext = PERMITTED_PAYMENT_TRANSITIONS[currentPaymentStatus];
        if (!allowedNext || !allowedNext.includes(nextPaymentStatus.trim().toUpperCase())) {
          throw createError(
            400,
            'VALIDATION_ERROR',
            `Invalid payment status transition from "${currentPaymentStatus}" to "${nextPaymentStatus}".`
          );
        }
        resolvedPaymentStatus = nextPaymentStatus.trim().toUpperCase();
      }
    }
  }

  return {
    orderStatus: resolvedOrderStatus,
    paymentStatus: resolvedPaymentStatus,
    stockAction,
  };
}

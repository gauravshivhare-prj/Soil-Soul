import { createError } from '../../utils/createError.js';

/**
 * Supported payment methods configuration.
 * COD is currently the only available payment method.
 * Online payment is displayed as Coming Soon and disabled.
 */
export const SUPPORTED_PAYMENT_METHODS = Object.freeze({
  COD: 'COD',
});

export const PAYMENT_METHODS_CONFIG = Object.freeze([
  {
    id: 'COD',
    name: 'Cash on Delivery',
    enabled: true,
    badge: null,
    description: 'Pay with cash upon delivery of your order.',
  },
  {
    id: 'ONLINE',
    name: 'Online Payment',
    enabled: false,
    badge: 'Coming Soon',
    description: 'Online payments will be available soon.',
  },
]);

/**
 * Validate payment method request.
 * Strictly accepts COD. Rejects ONLINE with a clear Coming Soon error.
 * Rejects any unknown or malformed payment method.
 */
export function validatePaymentMethod(method) {
  if (!method || typeof method !== 'string' || !method.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Payment method is required.');
  }

  const clean = method.trim().toUpperCase();

  if (clean === 'ONLINE' || clean === 'RAZORPAY') {
    throw createError(
      400,
      'PAYMENT_METHOD_UNAVAILABLE',
      'Online payment is coming soon. Please select Cash on Delivery (COD).'
    );
  }

  if (clean !== SUPPORTED_PAYMENT_METHODS.COD) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Unsupported payment method: "${clean}". Only Cash on Delivery (COD) is currently supported.`
    );
  }

  return clean;
}

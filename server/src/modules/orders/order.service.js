import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Order } from './order.model.js';
import { Cart } from '../cart/cart.model.js';
import { Product } from '../products/product.model.js';
import { validatePaymentMethod } from './payment.strategy.js';
import { createError } from '../../utils/createError.js';
import { validateOrderLifecycleUpdate, validateOrderTransition, validateCODPaymentTransition, isTerminalOrderState, ORDER_STATUS, PAYMENT_STATUS } from './order.transitions.js';
import { logError } from '../../utils/logError.js';

/**
 * Check if the active MongoDB deployment supports multi-document transactions.
 * Transactions require a replica set ('ReplicaSetWithPrimary' or 'Sharded').
 */
export function isTransactionSupported() {
  const client = mongoose.connection.getClient ? mongoose.connection.getClient() : null;
  const topoType = client?.topology?.description?.type;
  return topoType === 'ReplicaSetWithPrimary' || topoType === 'Sharded';
}

/**
 * Generate a unique, non-guessable, human-readable order number.
 * Format: ORD-YYYYMMDD-XXXXXX
 */
export function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${randomHex}`;
}

/**
 * Validate and sanitize delivery address fields.
 */
export function validateDeliveryAddress(address) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    throw createError(400, 'VALIDATION_ERROR', 'Delivery address is required.');
  }

  const { recipientName, phone, addressLine1, addressLine2, city, state, postalCode, country } = address;

  if (typeof recipientName !== 'string' || recipientName.trim().length < 2 || recipientName.trim().length > 100) {
    throw createError(400, 'VALIDATION_ERROR', 'Recipient name must be between 2 and 100 characters.');
  }

  if (typeof phone !== 'string' || !/^\+?[0-9]{10,15}$/.test(phone.trim().replace(/[\s-]/g, ''))) {
    throw createError(400, 'VALIDATION_ERROR', 'Valid phone number is required (10-15 digits).');
  }

  if (typeof addressLine1 !== 'string' || addressLine1.trim().length < 3 || addressLine1.trim().length > 200) {
    throw createError(400, 'VALIDATION_ERROR', 'Address line 1 must be between 3 and 200 characters.');
  }

  if (typeof city !== 'string' || city.trim().length < 2 || city.trim().length > 100) {
    throw createError(400, 'VALIDATION_ERROR', 'City must be between 2 and 100 characters.');
  }

  if (typeof state !== 'string' || state.trim().length < 2 || state.trim().length > 100) {
    throw createError(400, 'VALIDATION_ERROR', 'State must be between 2 and 100 characters.');
  }

  if (typeof postalCode !== 'string' || !/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
    throw createError(400, 'VALIDATION_ERROR', 'Valid 6-digit postal code is required.');
  }

  return {
    recipientName: recipientName.trim(),
    phone: phone.trim().replace(/[\s-]/g, ''),
    addressLine1: addressLine1.trim(),
    addressLine2: typeof addressLine2 === 'string' ? addressLine2.trim().slice(0, 200) : '',
    city: city.trim(),
    state: state.trim(),
    postalCode: postalCode.trim(),
    country: typeof country === 'string' && country.trim() ? country.trim().slice(0, 50) : 'India',
  };
}

// In-flight per-user checkout locking to prevent double-click / rapid concurrent checkout races (process-local)
const activeCheckouts = new Set();

/**
 * Validate and sanitize client-provided Idempotency-Key.
 * Must be a bounded string (1-100 chars) with safe characters.
 */
export function validateIdempotencyKey(key) {
  if (key === undefined || key === null || key === '') {
    return null;
  }
  if (typeof key !== 'string') {
    throw createError(400, 'VALIDATION_ERROR', 'Idempotency-Key must be a string.');
  }
  const trimmed = key.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    throw createError(400, 'VALIDATION_ERROR', 'Idempotency-Key must be between 1 and 100 characters.');
  }
  if (!/^[a-zA-Z0-9_\-\.]{1,100}$/.test(trimmed)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      'Idempotency-Key must contain only alphanumeric characters, hyphens, dots, or underscores.'
    );
  }
  return trimmed;
}

/**
 * Attempt to restore decremented stock for items after a checkout failure.
 * Retries up to 3 times for transient failures and aggregates unrecoverable failures.
 * Failures are never silently ignored.
 */
export async function rollbackStock(decremented) {
  const rollbackErrors = [];

  for (const d of decremented) {
    let restored = false;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await Product.updateOne(
          { _id: d.productId },
          { $inc: { stock: d.quantity } }
        );
        if (res.acknowledged && res.modifiedCount > 0) {
          restored = true;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!restored) {
      rollbackErrors.push({
        productId: d.productId?.toString ? d.productId.toString() : d.productId,
        quantity: d.quantity,
        error: lastError?.message || 'Update not acknowledged',
      });
    }
  }

  return rollbackErrors;
}

/**
 * Execute order placement ensuring stock consistency across items.
 * Uses MongoDB transactions when supported (replica sets/sharded clusters),
 * and conditional atomic decrements with compensating rollbacks for standalone servers.
 */
async function executeOrderPlacement(orderData) {
  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. Conditionally decrement stock for all items
      for (const item of orderData.items) {
        const updateRes = await Product.updateOne(
          { _id: item.product, stock: { $gte: item.quantity }, isActive: true },
          { $inc: { stock: -item.quantity } },
          { session }
        );
        if (updateRes.modifiedCount === 0) {
          throw createError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for "${item.name}". Another checkout may have completed simultaneously.`
          );
        }
      }

      // 2. Create the order
      const [order] = await Order.create(
        [
          {
            orderNumber: orderData.orderNumber,
            idempotencyKey: orderData.idempotencyKey,
            user: orderData.userId,
            items: orderData.items,
            deliveryAddress: orderData.deliveryAddress,
            subtotal: orderData.subtotal,
            shippingFee: orderData.shippingFee,
            discount: orderData.discount,
            total: orderData.total,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: 'PENDING',
            orderStatus: 'PLACED',
          },
        ],
        { session }
      );

      // 3. Clear user's cart
      await Cart.updateOne({ user: orderData.userId }, { $set: { items: [] } }, { session });

      // 4. Commit transaction
      await session.commitTransaction();
      return { order, isExisting: false, cartCleared: true, warning: null };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } else {
    // Standalone deployment: conditional atomic decrement with compensating rollback
    const decremented = [];
    try {
      for (const item of orderData.items) {
        const updateRes = await Product.updateOne(
          { _id: item.product, stock: { $gte: item.quantity }, isActive: true },
          { $inc: { stock: -item.quantity } }
        );
        if (updateRes.modifiedCount === 0) {
          // Insufficient stock or concurrent race - rollback prior decrements
          const rollbackErrors = await rollbackStock(decremented);
          if (rollbackErrors.length > 0) {
            const criticalErr = createError(
              500,
              'STOCK_ROLLBACK_FAILED',
              `Checkout failed for "${item.name}" and automated inventory rollback failed for ${rollbackErrors.length} item(s).`
            );
            criticalErr.rollbackFailures = rollbackErrors;
            throw criticalErr;
          }

          throw createError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for "${item.name}". Another checkout may have completed simultaneously.`
          );
        }
        decremented.push({ productId: item.product, quantity: item.quantity });
      }

      let order;
      try {
        order = await Order.create({
          orderNumber: orderData.orderNumber,
          idempotencyKey: orderData.idempotencyKey,
          user: orderData.userId,
          items: orderData.items,
          deliveryAddress: orderData.deliveryAddress,
          subtotal: orderData.subtotal,
          shippingFee: orderData.shippingFee,
          discount: orderData.discount,
          total: orderData.total,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: 'PENDING',
          orderStatus: 'PLACED',
        });
      } catch (orderErr) {
        // Roll back decremented stock if order creation failed
        const rollbackErrors = await rollbackStock(decremented);
        if (rollbackErrors.length > 0) {
          const criticalErr = createError(
            500,
            'STOCK_ROLLBACK_FAILED',
            `Order creation failed and automated inventory rollback failed for ${rollbackErrors.length} item(s).`
          );
          criticalErr.rollbackFailures = rollbackErrors;
          criticalErr.originalCause = orderErr.message;
          throw criticalErr;
        }

        // Handle duplicate key race condition on idempotencyKey
        if (orderErr.code === 11000 && orderData.idempotencyKey) {
          const existingOrder = await Order.findOne({
            user: orderData.userId,
            idempotencyKey: orderData.idempotencyKey,
          });
          if (existingOrder) {
            try {
              await Cart.updateOne({ user: orderData.userId }, { $set: { items: [] } });
            } catch (_) {}
            return { order: existingOrder, isExisting: true, cartCleared: true, warning: null };
          }
        }

        throw orderErr;
      }

      // Clear user's cart only after successful order creation
      // Handle partial failure explicitly: never report checkout as an ordinary failure if an order already exists
      let cartCleared = false;
      let warning = null;
      try {
        await Cart.updateOne({ user: orderData.userId }, { $set: { items: [] } });
        cartCleared = true;
      } catch (cartErr) {
        warning = 'Order placed successfully, but cart could not be cleared automatically.';
      }

      return { order, isExisting: false, cartCleared, warning };
    } catch (err) {
      throw err;
    }
  }
}

/**
 * Create an order from the authenticated user's cart using Cash on Delivery (COD).
 */
export async function createOrder(userId, { paymentMethod, deliveryAddress, idempotencyKey } = {}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  // Validate and sanitize idempotency key if provided
  const cleanIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  // Check for in-flight concurrent checkout lock on this user (process-local)
  const userLockKey = userId.toString();
  if (activeCheckouts.has(userLockKey)) {
    throw createError(
      409,
      'CHECKOUT_IN_PROGRESS',
      'A checkout is already in progress for your account. Please wait a moment.'
    );
  }

  // If idempotency key provided, check for existing order
  if (cleanIdempotencyKey) {
    const existingOrder = await Order.findOne({
      user: userId,
      idempotencyKey: cleanIdempotencyKey,
    });
    if (existingOrder) {
      try {
        await Cart.updateOne({ user: userId }, { $set: { items: [] } });
      } catch (_) {}
      return { order: existingOrder, isExisting: true, cartCleared: true, warning: null };
    }
  }

  activeCheckouts.add(userLockKey);
  try {
    // 1. Validate payment method (only COD enabled)
    const validatedPaymentMethod = validatePaymentMethod(paymentMethod);

    // 2. Validate delivery address
    const validatedAddress = validateDeliveryAddress(deliveryAddress);

    // 3. Load user's cart from database
    const cart = await Cart.findOne({ user: userId });
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw createError(400, 'VALIDATION_ERROR', 'Your cart is empty. Add items before placing an order.');
    }

    // Safety guard against duplicate orders if a prior cart-clear failed:
    // Check if an order was placed by this user in the last 2 minutes with matching items
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentOrder = await Order.findOne({
      user: userId,
      createdAt: { $gte: twoMinutesAgo },
      orderStatus: 'PLACED',
    }).sort({ createdAt: -1 });

    if (
      recentOrder &&
      cart.updatedAt &&
      new Date(cart.updatedAt).getTime() <= new Date(recentOrder.createdAt).getTime() &&
      Array.isArray(recentOrder.items) &&
      recentOrder.items.length === cart.items.length
    ) {
      const isExactMatch = cart.items.every((cartIt) => {
        const orderIt = recentOrder.items.find(
          (oIt) => oIt.product?.toString() === cartIt.product?.toString()
        );
        return orderIt && orderIt.quantity === cartIt.quantity;
      });

      if (isExactMatch) {
        // Clear stale cart now and return the existing order safely
        try {
          await Cart.updateOne({ user: userId }, { $set: { items: [] } });
        } catch (_) {}
        return {
          order: recentOrder,
          isExisting: true,
          cartCleared: true,
          warning: 'A matching order was placed moments ago. Displaying your existing order.',
        };
      }
    }

  // 4. Validate all cart items against live catalog
  const productIds = cart.items.map((it) => it.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } })
    .populate({
      path: 'category',
      select: 'name slug isActive',
    })
    .select('_id name slug price mrp stock images options isActive category');

  const productMap = new Map();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  const orderItemSnapshots = [];
  let calculatedSubtotal = 0;

  for (const item of cart.items) {
    const prod = productMap.get(item.product?.toString());

    if (!prod) {
      throw createError(400, 'VALIDATION_ERROR', 'One or more products in your cart are no longer available.');
    }

    if (!prod.isActive) {
      throw createError(400, 'VALIDATION_ERROR', `"${prod.name}" is currently unavailable.`);
    }

    if (!prod.category || !prod.category.isActive) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `"${prod.name}" is currently unavailable because its category is inactive.`
      );
    }

    let unitPrice = prod.price;
    let selectedOption = null;

    if (item.optionId) {
      const choice = prod.options?.choices?.find(
        (c) => c.id && c.id.trim().toLowerCase() === item.optionId.trim().toLowerCase()
      );
      if (!choice) {
        throw createError(
          400,
          'VALIDATION_ERROR',
          `The selected option for "${prod.name}" is no longer available.`
        );
      }
      selectedOption = {
        id: choice.id,
        name: choice.name,
        detail: choice.detail,
        priceDelta: choice.priceDelta || 0,
      };
      unitPrice = Math.max(0, unitPrice + (choice.priceDelta || 0));
    }

    unitPrice = Math.round(unitPrice * 100) / 100;

    if (item.quantity > prod.stock) {
      throw createError(
        400,
        'INSUFFICIENT_STOCK',
        `Insufficient stock for "${prod.name}". Requested: ${item.quantity}, Available: ${prod.stock}.`
      );
    }

    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
    calculatedSubtotal = Math.round((calculatedSubtotal + lineTotal) * 100) / 100;

    orderItemSnapshots.push({
      product: prod._id,
      name: prod.name,
      slug: prod.slug,
      image: prod.images?.[0] || null,
      option: selectedOption,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
    });
  }

  const shippingFee = 0;
  const discount = 0;
  const total = Math.round((calculatedSubtotal + shippingFee - discount) * 100) / 100;

    const orderNumber = generateOrderNumber();

    return await executeOrderPlacement({
      userId,
      orderNumber,
      idempotencyKey: cleanIdempotencyKey,
      items: orderItemSnapshots,
      deliveryAddress: validatedAddress,
      subtotal: calculatedSubtotal,
      shippingFee,
      discount,
      total,
      paymentMethod: validatedPaymentMethod,
    });
  } finally {
    activeCheckouts.delete(userLockKey);
  }
}

/**
 * Retrieve the authenticated user's order history.
 */
export async function getOrderHistory(userId, { page = 1, limit = 10 } = {}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const [orders, total] = await Promise.all([
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Order.countDocuments({ user: userId }),
  ]);

  return {
    orders,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    },
  };
}

/**
 * Retrieve a specific order by ID or orderNumber, strictly verifying user ownership.
 */
export async function getOrderById(userId, orderId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Order identifier is required.');
  }

  const cleanId = orderId.trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);

  const query = { user: userId };
  if (isObjectId) {
    query.$or = [{ _id: cleanId }, { orderNumber: cleanId.toUpperCase() }];
  } else {
    query.orderNumber = cleanId.toUpperCase();
  }

  const order = await Order.findOne(query);
  if (!order) {
    throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  return order;
}

/**
 * Attempt to restore product stock for cancelled order items.
 * Retries up to 3 times for transient failures.
 * Tracks missing products and update failures without silently dropping accounting.
 *
 * @param {Array<{ product: string|import('mongoose').Types.ObjectId, quantity: number, name?: string }>} items
 * @param {import('mongoose').ClientSession|null} [session=null]
 * @returns {Promise<Array<{ productId: string, name?: string, quantity: number, error: string }>>} Array of restoration failure records
 */
export async function restoreStockForOrder(items, session = null, orderContext = {}) {
  const restorationErrors = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Skip if already restored on the order item snapshot
    if (item.stockRestored === true) {
      continue;
    }

    const productId = item.product?._id || item.product;
    const quantity = item.quantity;
    let restored = false;
    let lastError = null;

    // Durable operation key ensuring exactly-once restoration on standalone MongoDB
    const opKey = orderContext?.orderId
      ? `restore:${orderContext.orderId.toString()}:${i}:${productId?.toString ? productId.toString() : productId}`
      : null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const updateOptions = session ? { session } : {};

        const filter = { _id: productId };
        const updateOps = { $inc: { stock: quantity } };

        if (opKey) {
          filter['restorationAudit.opKey'] = { $ne: opKey };
          updateOps.$push = {
            restorationAudit: {
              opKey,
              orderId: orderContext.orderId || null,
              orderNumber: orderContext.orderNumber || null,
              quantity,
              restoredAt: new Date(),
            },
          };
        }

        const res = await Product.updateOne(filter, updateOps, updateOptions);

        if (res.acknowledged) {
          if (res.modifiedCount > 0) {
            restored = true;
            item.stockRestored = true;
            item.restoredAt = new Date();
            break;
          } else if (res.matchedCount === 0) {
            // Check if opKey was already applied (crash recovery idempotency)
            if (opKey) {
              const alreadyApplied = await Product.findOne(
                { _id: productId, 'restorationAudit.opKey': opKey },
                { _id: 1 },
                updateOptions
              );
              if (alreadyApplied) {
                // Stock was already incremented prior to crash or retry!
                restored = true;
                item.stockRestored = true;
                item.restoredAt = new Date();
                break;
              }
            }
            lastError = new Error('Product not found in catalog');
            break;
          } else {
            restored = true;
            item.stockRestored = true;
            item.restoredAt = new Date();
            break;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!restored) {
      restorationErrors.push({
        productId: productId?.toString ? productId.toString() : productId,
        name: item.name || null,
        quantity,
        error: lastError?.message || 'Update not acknowledged',
      });
    }
  }

  return restorationErrors;
}

/**
 * Cancel an order for the authenticated customer with safe inventory restoration.
 *
 * @param {string} userId - Authenticated user's ID
 * @param {string} orderId - Order ID or orderNumber
 * @param {Object} [options]
 * @param {string} [options.reason] - Optional cancellation reason
 * @param {string} [options.actorRole='customer'] - Role of actor initiating cancellation
 * @returns {Promise<{ order: Object, warning: string|null }>}
 */
export async function cancelOrder(userId, orderId, { reason, actorRole = 'customer' } = {}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Order identifier is required.');
  }

  // Sanitize and validate cancellation reason if provided
  let cleanReason = null;
  if (reason !== undefined && reason !== null) {
    if (typeof reason !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'Cancellation reason must be a string.');
    }
    const trimmed = reason.trim();
    if (trimmed.length > 500) {
      throw createError(400, 'VALIDATION_ERROR', 'Cancellation reason cannot exceed 500 characters.');
    }
    cleanReason = trimmed.length > 0 ? trimmed : null;
  }

  const cleanId = orderId.trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);

  // Ownership verification: user can only see and cancel their own order
  const query = { user: userId };
  if (isObjectId) {
    query.$or = [{ _id: cleanId }, { orderNumber: cleanId.toUpperCase() }];
  } else {
    query.orderNumber = cleanId.toUpperCase();
  }

  const existingOrder = await Order.findOne(query);
  if (!existingOrder) {
    throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  // Validate transition rules and permissions via order.transitions.js
  validateOrderLifecycleUpdate({
    currentOrderStatus: existingOrder.orderStatus,
    nextOrderStatus: ORDER_STATUS.CANCELLED,
    currentPaymentStatus: existingOrder.paymentStatus,
    actorRole,
  });

  const now = new Date();
  const cancellationData = {
    reason: cleanReason,
    cancelledAt: now,
    cancelledBy: userId,
    actorRole,
    stockRestorationStatus: 'PENDING',
    restorationErrors: [],
    isReconciling: false,
    reconciliationToken: null,
    reconciliationLeaseExpiresAt: null,
    reconciliationFencingToken: 0,
  };

  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Atomic conditional update: only win if still in PLACED or CONFIRMED
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: existingOrder._id,
          user: userId,
          orderStatus: { $in: ['PLACED', 'CONFIRMED'] },
        },
        {
          $set: {
            orderStatus: ORDER_STATUS.CANCELLED,
            cancellation: cancellationData,
          },
        },
        { returnDocument: 'after', session }
      );

      if (!updatedOrder) {
        // Lost race condition: order was transitioned or cancelled concurrently
        const current = await Order.findById(existingOrder._id).session(session);
        if (!current || current.user.toString() !== userId.toString()) {
          throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
        }
        throw createError(
          400,
          'VALIDATION_ERROR',
          `Order cannot be cancelled in its current status ("${current.orderStatus}").`
        );
      }

      // Restore stock for all items
      const restorationErrors = await restoreStockForOrder(
        updatedOrder.items,
        session,
        { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
      );
      if (restorationErrors.length > 0) {
        const criticalErr = createError(
          500,
          'STOCK_RESTORATION_FAILED',
          `Order cancellation failed because inventory could not be restored for ${restorationErrors.length} item(s).`
        );
        criticalErr.restorationFailures = restorationErrors;
        logError('[cancellation:stock_restoration_failed]', criticalErr);
        throw criticalErr;
      }

      await Order.updateOne(
        { _id: updatedOrder._id },
        {
          $set: {
            items: updatedOrder.items,
            'cancellation.stockRestorationStatus': 'COMPLETED',
            'cancellation.restorationErrors': [],
          },
        },
        { session }
      );

      await session.commitTransaction();

      console.log(
        JSON.stringify({
          event: 'ORDER_STOCK_RESTORATION_COMPLETED',
          orderId: updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber,
          restorationStatus: 'COMPLETED',
          actorRole,
          timestamp: now.toISOString(),
        })
      );

      return { order: await Order.findById(updatedOrder._id), warning: null };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } else {
    // Standalone MongoDB: atomic conditional status update first to ensure exactly-once execution
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: existingOrder._id,
        user: userId,
        orderStatus: { $in: ['PLACED', 'CONFIRMED'] },
      },
      {
        $set: {
          orderStatus: ORDER_STATUS.CANCELLED,
          cancellation: cancellationData,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedOrder) {
      // Lost race to another concurrent request
      const current = await Order.findById(existingOrder._id);
      if (!current || current.user.toString() !== userId.toString()) {
        throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      }
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Order cannot be cancelled in its current status ("${current.orderStatus}").`
      );
    }

    // Only the single request that won the transition restores stock
    const restorationErrors = await restoreStockForOrder(
      updatedOrder.items,
      null,
      { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
    );

    const hasAnyRestored = updatedOrder.items.some((i) => i.stockRestored);
    const finalRestorationStatus =
      restorationErrors.length === 0
        ? 'COMPLETED'
        : hasAnyRestored
        ? 'PARTIAL'
        : 'FAILED';

    await Order.updateOne(
      { _id: updatedOrder._id },
      {
        $set: {
          items: updatedOrder.items,
          'cancellation.stockRestorationStatus': finalRestorationStatus,
          'cancellation.restorationErrors': restorationErrors,
          'cancellation.isReconciling': false,
        },
      }
    );

    if (restorationErrors.length > 0) {
      console.log(
        JSON.stringify({
          event: 'ORDER_STOCK_RESTORATION_FAILED',
          orderId: updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber,
          restorationStatus: finalRestorationStatus,
          failedCount: restorationErrors.length,
          actorRole,
          timestamp: new Date().toISOString(),
        })
      );

      const criticalErr = createError(
        500,
        'STOCK_RESTORATION_FAILED',
        `Order cancelled, but inventory restoration failed for ${restorationErrors.length} item(s). Manual reconciliation required.`
      );
      criticalErr.restorationFailures = restorationErrors;
      criticalErr.order = await Order.findById(updatedOrder._id);
      logError('[cancellation:stock_restoration_failed]', criticalErr);
      throw criticalErr;
    }

    console.log(
      JSON.stringify({
        event: 'ORDER_STOCK_RESTORATION_COMPLETED',
        orderId: updatedOrder._id.toString(),
        orderNumber: updatedOrder.orderNumber,
        restorationStatus: 'COMPLETED',
        actorRole,
        timestamp: new Date().toISOString(),
      })
    );

    return { order: await Order.findById(updatedOrder._id), warning: null };
  }
}

/**
 * Retrieve orders for admin with validated filtering, searching, sorting, and pagination.
 *
 * @param {Object} [params]
 * @param {string|number} [params.page=1]
 * @param {string|number} [params.limit=10]
 * @param {string} [params.orderStatus]
 * @param {string} [params.paymentStatus]
 * @param {string} [params.paymentMethod]
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @param {string} [params.search]
 * @param {string} [params.sortBy='createdAt']
 * @param {string} [params.sortOrder='desc']
 * @returns {Promise<{ orders: Array, pagination: Object }>}
 */
export async function getAdminOrders({
  page = 1,
  limit = 10,
  orderStatus,
  paymentStatus,
  paymentMethod,
  startDate,
  endDate,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) {
  // 1. Pagination validation
  let parsedPage = 1;
  if (page !== undefined && page !== null && String(page).trim() !== '') {
    const rawPage = String(page).trim();
    if (!/^\d+$/.test(rawPage) || parseInt(rawPage, 10) < 1) {
      throw createError(400, 'VALIDATION_ERROR', 'Page must be a positive integer.');
    }
    parsedPage = parseInt(rawPage, 10);
  }

  let parsedLimit = 10;
  if (limit !== undefined && limit !== null && String(limit).trim() !== '') {
    const rawLimit = String(limit).trim();
    if (!/^\d+$/.test(rawLimit) || parseInt(rawLimit, 10) < 1 || parseInt(rawLimit, 10) > 100) {
      throw createError(400, 'VALIDATION_ERROR', 'Limit must be an integer between 1 and 100.');
    }
    parsedLimit = parseInt(rawLimit, 10);
  }

  const query = {};

  // 2. Filter: orderStatus
  if (orderStatus !== undefined && orderStatus !== null && String(orderStatus).trim() !== '') {
    const cleanStatus = String(orderStatus).trim().toUpperCase();
    if (!Object.values(ORDER_STATUS).includes(cleanStatus)) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Invalid order status filter: "${orderStatus}". Allowed: ${Object.values(ORDER_STATUS).join(', ')}`
      );
    }
    query.orderStatus = cleanStatus;
  }

  // 3. Filter: paymentStatus
  if (paymentStatus !== undefined && paymentStatus !== null && String(paymentStatus).trim() !== '') {
    const cleanPayStatus = String(paymentStatus).trim().toUpperCase();
    if (!Object.values(PAYMENT_STATUS).includes(cleanPayStatus)) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Invalid payment status filter: "${paymentStatus}". Allowed: ${Object.values(PAYMENT_STATUS).join(', ')}`
      );
    }
    query.paymentStatus = cleanPayStatus;
  }

  // 4. Filter: paymentMethod
  if (paymentMethod !== undefined && paymentMethod !== null && String(paymentMethod).trim() !== '') {
    const cleanMethod = String(paymentMethod).trim().toUpperCase();
    if (cleanMethod !== 'COD') {
      throw createError(400, 'VALIDATION_ERROR', `Invalid payment method filter: "${paymentMethod}". Allowed: COD`);
    }
    query.paymentMethod = cleanMethod;
  }

  // 5. Filter: Date Range (createdAt)
  let startMs = null;
  let endMs = null;
  if (startDate !== undefined && startDate !== null && String(startDate).trim() !== '') {
    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      throw createError(400, 'VALIDATION_ERROR', 'Invalid startDate format. Must be a valid date.');
    }
    startMs = parsedStart;
  }

  if (endDate !== undefined && endDate !== null && String(endDate).trim() !== '') {
    const parsedEnd = new Date(endDate);
    if (isNaN(parsedEnd.getTime())) {
      throw createError(400, 'VALIDATION_ERROR', 'Invalid endDate format. Must be a valid date.');
    }
    endMs = parsedEnd;
  }

  if (startMs && endMs && startMs > endMs) {
    throw createError(400, 'VALIDATION_ERROR', 'startDate cannot be later than endDate.');
  }

  if (startMs || endMs) {
    query.createdAt = {};
    if (startMs) query.createdAt.$gte = startMs;
    if (endMs) query.createdAt.$lte = endMs;
  }

  // 6. Search: orderNumber
  if (search !== undefined && search !== null && String(search).trim() !== '') {
    const rawSearch = String(search).trim();
    if (rawSearch.length > 100) {
      throw createError(400, 'VALIDATION_ERROR', 'Search query cannot exceed 100 characters.');
    }
    const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.orderNumber = { $regex: escaped, $options: 'i' };
  }

  // 7. Sorting
  const ALLOWED_SORT_FIELDS = ['createdAt', 'total', 'orderNumber', 'orderStatus'];
  const cleanSortBy = String(sortBy).trim();
  if (!ALLOWED_SORT_FIELDS.includes(cleanSortBy)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Invalid sort field: "${sortBy}". Allowed: ${ALLOWED_SORT_FIELDS.join(', ')}`
    );
  }

  const cleanSortOrder = String(sortOrder).trim().toLowerCase();
  if (!['asc', 'desc', '1', '-1'].includes(cleanSortOrder)) {
    throw createError(400, 'VALIDATION_ERROR', `Invalid sort order: "${sortOrder}". Allowed: asc, desc`);
  }
  const sortDirection = cleanSortOrder === 'asc' || cleanSortOrder === '1' ? 1 : -1;
  const sort = { [cleanSortBy]: sortDirection };

  // 8. Execute Query
  const skip = (parsedPage - 1) * parsedLimit;
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parsedLimit)
      .populate('user', 'name email role'),
    Order.countDocuments(query),
  ]);

  return {
    orders,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    },
  };
}

/**
 * Retrieve complete order details for admin by ObjectId or orderNumber.
 *
 * @param {string} orderId - MongoDB ObjectId or orderNumber
 * @returns {Promise<Object>}
 */
export async function getAdminOrderById(orderId) {
  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Order identifier is required.');
  }

  const cleanId = orderId.trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);

  let query;
  if (isObjectId) {
    query = { $or: [{ _id: cleanId }, { orderNumber: cleanId.toUpperCase() }] };
  } else {
    query = { orderNumber: cleanId.toUpperCase() };
  }

  const order = await Order.findOne(query).populate('user', 'name email role');
  if (!order) {
    throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  return order;
}

/**
 * Update order status by administrator with state machine enforcement and inventory tracking.
 *
 * @param {string} orderId - Order ObjectId or orderNumber
 * @param {Object} params
 * @param {string} params.orderStatus - Next target order status
 * @param {string} [params.reason] - Optional reason (for cancellations)
 * @param {string} params.adminUserId - Authenticated admin's user ID
 * @returns {Promise<Object>} Updated order document
 */
export async function updateOrderStatusByAdmin(orderId, { orderStatus, reason, adminUserId } = {}) {
  if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid administrator identity.');
  }

  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Order identifier is required.');
  }

  if (!orderStatus || typeof orderStatus !== 'string' || !orderStatus.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Target order status is required.');
  }

  const cleanNextStatus = orderStatus.trim().toUpperCase();
  if (!Object.values(ORDER_STATUS).includes(cleanNextStatus)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Invalid order status: "${orderStatus}". Allowed: ${Object.values(ORDER_STATUS).join(', ')}`
    );
  }

  // Sanitize reason if provided
  let cleanReason = null;
  if (reason !== undefined && reason !== null) {
    if (typeof reason !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'Cancellation reason must be a string.');
    }
    const trimmed = reason.trim();
    if (trimmed.length > 500) {
      throw createError(400, 'VALIDATION_ERROR', 'Cancellation reason cannot exceed 500 characters.');
    }
    cleanReason = trimmed.length > 0 ? trimmed : null;
  }

  const cleanId = orderId.trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);
  const query = isObjectId
    ? { $or: [{ _id: cleanId }, { orderNumber: cleanId.toUpperCase() }] }
    : { orderNumber: cleanId.toUpperCase() };

  const existingOrder = await Order.findOne(query);
  if (!existingOrder) {
    throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  // Transition validation
  const validatedStatus = validateOrderTransition(existingOrder.orderStatus, cleanNextStatus);

  const now = new Date();

  // If transitioning to CANCELLED, stock needs to be restored!
  if (validatedStatus === ORDER_STATUS.CANCELLED) {
    const cancellationData = {
      reason: cleanReason || 'Cancelled by administrator',
      cancelledAt: now,
      cancelledBy: adminUserId,
      actorRole: 'admin',
      stockRestorationStatus: 'PENDING',
      restorationErrors: [],
      isReconciling: false,
      reconciliationToken: null,
      reconciliationLeaseExpiresAt: null,
      reconciliationFencingToken: 0,
    };

    if (isTransactionSupported()) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        const updatedOrder = await Order.findOneAndUpdate(
          {
            _id: existingOrder._id,
            orderStatus: existingOrder.orderStatus,
          },
          {
            $set: {
              orderStatus: ORDER_STATUS.CANCELLED,
              cancellation: cancellationData,
            },
          },
          { returnDocument: 'after', session }
        );

        if (!updatedOrder) {
          const current = await Order.findById(existingOrder._id).session(session);
          throw createError(
            400,
            'VALIDATION_ERROR',
            `Order status was concurrently modified to "${current?.orderStatus}".`
          );
        }

        const restorationErrors = await restoreStockForOrder(
          updatedOrder.items,
          session,
          { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
        );
        if (restorationErrors.length > 0) {
          const criticalErr = createError(
            500,
            'STOCK_RESTORATION_FAILED',
            `Order cancellation failed because inventory could not be restored for ${restorationErrors.length} item(s).`
          );
          criticalErr.restorationFailures = restorationErrors;
          logError('[admin:stock_restoration_failed]', criticalErr);
          throw criticalErr;
        }

        await Order.updateOne(
          { _id: updatedOrder._id },
          {
            $set: {
              items: updatedOrder.items,
              'cancellation.stockRestorationStatus': 'COMPLETED',
              'cancellation.restorationErrors': [],
            },
          },
          { session }
        );

        await session.commitTransaction();

        // Structured audit logging
        console.log(
          JSON.stringify({
            event: 'ADMIN_ORDER_STATUS_UPDATED',
            orderId: updatedOrder._id.toString(),
            orderNumber: updatedOrder.orderNumber,
            previousStatus: existingOrder.orderStatus,
            newStatus: validatedStatus,
            restorationStatus: 'COMPLETED',
            adminId: adminUserId,
            timestamp: now.toISOString(),
          })
        );

        return await Order.findById(updatedOrder._id).populate('user', 'name email role');
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } else {
      // Standalone MongoDB
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: existingOrder._id,
          orderStatus: existingOrder.orderStatus,
        },
        {
          $set: {
            orderStatus: ORDER_STATUS.CANCELLED,
            cancellation: cancellationData,
          },
        },
        { returnDocument: 'after' }
      );

      if (!updatedOrder) {
        const current = await Order.findById(existingOrder._id);
        throw createError(
          400,
          'VALIDATION_ERROR',
          `Order status was concurrently modified to "${current?.orderStatus}".`
        );
      }

      const restorationErrors = await restoreStockForOrder(
        updatedOrder.items,
        null,
        { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber }
      );

      const hasAnyRestored = updatedOrder.items.some((i) => i.stockRestored);
      const finalRestorationStatus =
        restorationErrors.length === 0
          ? 'COMPLETED'
          : hasAnyRestored
          ? 'PARTIAL'
          : 'FAILED';

      await Order.updateOne(
        { _id: updatedOrder._id },
        {
          $set: {
            items: updatedOrder.items,
            'cancellation.stockRestorationStatus': finalRestorationStatus,
            'cancellation.restorationErrors': restorationErrors,
            'cancellation.isReconciling': false,
          },
        }
      );

      if (restorationErrors.length > 0) {
        console.log(
          JSON.stringify({
            event: 'ADMIN_STOCK_RESTORATION_FAILED',
            orderId: updatedOrder._id.toString(),
            orderNumber: updatedOrder.orderNumber,
            restorationStatus: finalRestorationStatus,
            failedCount: restorationErrors.length,
            adminId: adminUserId,
            timestamp: new Date().toISOString(),
          })
        );

        const criticalErr = createError(
          500,
          'STOCK_RESTORATION_FAILED',
          `Order cancelled, but inventory restoration failed for ${restorationErrors.length} item(s). Manual reconciliation required.`
        );
        criticalErr.restorationFailures = restorationErrors;
        criticalErr.order = await Order.findById(updatedOrder._id);
        logError('[admin:stock_restoration_failed]', criticalErr);
        throw criticalErr;
      }

      // Structured audit logging
      console.log(
        JSON.stringify({
          event: 'ADMIN_ORDER_STATUS_UPDATED',
          orderId: updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber,
          previousStatus: existingOrder.orderStatus,
          newStatus: validatedStatus,
          restorationStatus: 'COMPLETED',
          adminId: adminUserId,
          timestamp: now.toISOString(),
        })
      );

      return await Order.findById(updatedOrder._id).populate('user', 'name email role');
    }
  }

  // Non-cancellation status transitions (CONFIRMED, PROCESSING, SHIPPED, DELIVERED)
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: existingOrder._id,
      orderStatus: existingOrder.orderStatus, // Atomic optimistic lock
    },
    {
      $set: {
        orderStatus: validatedStatus,
      },
    },
    { returnDocument: 'after' }
  );

  if (!updatedOrder) {
    const current = await Order.findById(existingOrder._id);
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Order status was concurrently modified to "${current?.orderStatus}".`
    );
  }

  // Structured audit logging
  console.log(
    JSON.stringify({
      event: 'ADMIN_ORDER_STATUS_UPDATED',
      orderId: updatedOrder._id.toString(),
      orderNumber: updatedOrder.orderNumber,
      previousStatus: existingOrder.orderStatus,
      newStatus: validatedStatus,
      adminId: adminUserId,
      timestamp: now.toISOString(),
    })
  );

  return await Order.findById(updatedOrder._id).populate('user', 'name email role');
}

/**
 * Update payment status by administrator (e.g. COD collection on delivery or cash refund).
 *
 * @param {string} orderId - Order ObjectId or orderNumber
 * @param {Object} params
 * @param {string} params.paymentStatus - Target payment status (e.g. PAID or REFUNDED)
 * @param {string} [params.note] - Optional payment/receipt/refund note
 * @param {number} [params.amount] - Optional refund amount (defaults to order.total if not provided)
 * @param {string} [params.reason] - Optional refund reason
 * @param {string} params.adminUserId - Authenticated admin's user ID
 * @returns {Promise<Object>} Updated order document
 */
export async function updatePaymentStatusByAdmin(
  orderId,
  { paymentStatus, note, amount, reason, adminUserId } = {}
) {
  if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid administrator identity.');
  }

  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Order identifier is required.');
  }

  if (!paymentStatus || typeof paymentStatus !== 'string' || !paymentStatus.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Target payment status is required.');
  }

  const cleanNextPayment = paymentStatus.trim().toUpperCase();
  if (!Object.values(PAYMENT_STATUS).includes(cleanNextPayment)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Invalid payment status: "${paymentStatus}". Allowed: ${Object.values(PAYMENT_STATUS).join(', ')}`
    );
  }

  // Sanitize note if provided
  let cleanNote = null;
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      throw createError(400, 'VALIDATION_ERROR', 'Payment note must be a string.');
    }
    const trimmed = note.trim();
    if (trimmed.length > 500) {
      throw createError(400, 'VALIDATION_ERROR', 'Payment note cannot exceed 500 characters.');
    }
    cleanNote = trimmed.length > 0 ? trimmed : null;
  }

  const cleanId = orderId.trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);
  const query = isObjectId
    ? { $or: [{ _id: cleanId }, { orderNumber: cleanId.toUpperCase() }] }
    : { orderNumber: cleanId.toUpperCase() };

  const existingOrder = await Order.findOne(query);
  if (!existingOrder) {
    throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  // Only COD is currently enabled
  if (existingOrder.paymentMethod !== 'COD') {
    throw createError(400, 'VALIDATION_ERROR', 'Online payment collection is not enabled.');
  }

  // Validate payment transition rules
  const validatedPayment = validateCODPaymentTransition({
    currentPaymentStatus: existingOrder.paymentStatus,
    nextPaymentStatus: cleanNextPayment,
    orderStatus: existingOrder.orderStatus,
  });

  const now = new Date();

  // Case 1: Marking PAID (collection of payment)
  if (cleanNextPayment === PAYMENT_STATUS.PAID) {
    const validatedPayment = validateCODPaymentTransition({
      currentPaymentStatus: existingOrder.paymentStatus,
      nextPaymentStatus: cleanNextPayment,
      orderStatus: existingOrder.orderStatus,
    });

    const updateDoc = {
      $set: {
        paymentStatus: validatedPayment,
        paymentDetails: {
          collectedAt: now,
          collectedBy: adminUserId,
          note: cleanNote,
        },
      },
    };

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: existingOrder._id,
        paymentStatus: existingOrder.paymentStatus,
        orderStatus: ORDER_STATUS.DELIVERED,
      },
      updateDoc,
      { returnDocument: 'after' }
    );

    if (!updatedOrder) {
      const current = await Order.findById(existingOrder._id);
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Payment status could not be updated. Current status: "${current?.paymentStatus}", order status: "${current?.orderStatus}".`
      );
    }

    console.log(
      JSON.stringify({
        event: 'ADMIN_PAYMENT_STATUS_UPDATED',
        orderId: updatedOrder._id.toString(),
        orderNumber: updatedOrder.orderNumber,
        paymentMethod: updatedOrder.paymentMethod,
        previousPaymentStatus: existingOrder.paymentStatus,
        newPaymentStatus: validatedPayment,
        orderStatus: updatedOrder.orderStatus,
        adminId: adminUserId,
        timestamp: now.toISOString(),
      })
    );

    return await Order.findById(updatedOrder._id).populate('user', 'name email role');
  }

  // Case 2: Marking FAILED
  if (cleanNextPayment === PAYMENT_STATUS.FAILED) {
    const validatedPayment = validateCODPaymentTransition({
      currentPaymentStatus: existingOrder.paymentStatus,
      nextPaymentStatus: cleanNextPayment,
      orderStatus: existingOrder.orderStatus,
    });

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: existingOrder._id,
        paymentStatus: existingOrder.paymentStatus,
      },
      {
        $set: {
          paymentStatus: validatedPayment,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedOrder) {
      const current = await Order.findById(existingOrder._id);
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Payment status could not be updated. Current status: "${current?.paymentStatus}", order status: "${current?.orderStatus}".`
      );
    }

    console.log(
      JSON.stringify({
        event: 'ADMIN_PAYMENT_STATUS_UPDATED',
        orderId: updatedOrder._id.toString(),
        orderNumber: updatedOrder.orderNumber,
        paymentMethod: updatedOrder.paymentMethod,
        previousPaymentStatus: existingOrder.paymentStatus,
        newPaymentStatus: validatedPayment,
        adminId: adminUserId,
        timestamp: now.toISOString(),
      })
    );

    return await Order.findById(updatedOrder._id).populate('user', 'name email role');
  }

  // Case 3: REFUND (Full or Partial)
  if (
    cleanNextPayment === PAYMENT_STATUS.REFUNDED ||
    cleanNextPayment === PAYMENT_STATUS.PARTIALLY_REFUNDED
  ) {
    if (existingOrder.paymentStatus === PAYMENT_STATUS.REFUNDED) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        'Payment is already in "REFUNDED" status. Order is already fully refunded.'
      );
    }

    if (
      existingOrder.paymentStatus !== PAYMENT_STATUS.PAID &&
      existingOrder.paymentStatus !== PAYMENT_STATUS.PARTIALLY_REFUNDED
    ) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Invalid payment status transition from "${existingOrder.paymentStatus}" to "${cleanNextPayment}". Refunds can only be issued for collected payments.`
      );
    }

    const currentTotalRefunded = Number(existingOrder.totalRefunded || 0);
    const remainingBalance = Math.round((existingOrder.total - currentTotalRefunded) * 100) / 100;

    if (remainingBalance <= 0) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        'Order has already been fully refunded.'
      );
    }

    // Validate refund amount
    let cleanAmount;
    if (amount !== undefined && amount !== null) {
      if (typeof amount !== 'number' || isNaN(amount) || !Number.isFinite(amount)) {
        throw createError(400, 'VALIDATION_ERROR', 'Refund amount must be a valid number.');
      }
      if (amount <= 0) {
        throw createError(400, 'VALIDATION_ERROR', 'Refund amount must be greater than zero.');
      }
      cleanAmount = Math.round(amount * 100) / 100;
      if (cleanAmount > remainingBalance) {
        throw createError(
          400,
          'VALIDATION_ERROR',
          `Refund amount (Rs. ${cleanAmount}) cannot exceed remaining refundable balance of Rs. ${remainingBalance} (collected order total: Rs. ${existingOrder.total}, previously refunded: Rs. ${currentTotalRefunded}).`
        );
      }
    } else {
      // Default to full remaining balance
      cleanAmount = remainingBalance;
    }

    // Sanitize refund reason
    let cleanReason;
    if (reason !== undefined && reason !== null) {
      if (typeof reason !== 'string') {
        throw createError(400, 'VALIDATION_ERROR', 'Refund reason must be a string.');
      }
      const trimmedReason = reason.trim();
      if (trimmedReason.length > 500) {
        throw createError(400, 'VALIDATION_ERROR', 'Refund reason cannot exceed 500 characters.');
      }
      cleanReason = trimmedReason.length > 0 ? trimmedReason : 'Cash refund issued to customer';
    } else {
      cleanReason = 'Cash refund issued to customer';
    }

    const newTotalRefunded = Math.round((currentTotalRefunded + cleanAmount) * 100) / 100;
    const isFullRefund = newTotalRefunded >= existingOrder.total;
    const targetPaymentStatus = isFullRefund
      ? PAYMENT_STATUS.REFUNDED
      : PAYMENT_STATUS.PARTIALLY_REFUNDED;

    // Validate transition via state machine helper
    const validatedPayment = validateCODPaymentTransition({
      currentPaymentStatus: existingOrder.paymentStatus,
      nextPaymentStatus: targetPaymentStatus,
      orderStatus: existingOrder.orderStatus,
    });

    const refundRecord = {
      refundedAt: now,
      refundedBy: adminUserId,
      amount: cleanAmount,
      reason: cleanReason,
      note: cleanNote,
    };

    // Atomic update condition: optimistic concurrency lock on totalRefunded and current paymentStatus
    const atomicFilter = {
      _id: existingOrder._id,
      paymentStatus: existingOrder.paymentStatus,
      $or: [
        { totalRefunded: currentTotalRefunded },
        ...(currentTotalRefunded === 0 ? [{ totalRefunded: { $exists: false } }] : []),
      ],
    };

    const updateDoc = {
      $set: {
        paymentStatus: validatedPayment,
        totalRefunded: newTotalRefunded,
        refundDetails: refundRecord, // Snapshot for backward compatibility
      },
      $push: {
        refunds: refundRecord,
      },
    };

    const updatedOrder = await Order.findOneAndUpdate(
      atomicFilter,
      updateDoc,
      { returnDocument: 'after' }
    );

    if (!updatedOrder) {
      const current = await Order.findById(existingOrder._id);
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Refund could not be processed due to a concurrent payment or refund update. Current payment status: "${current?.paymentStatus}", total refunded: Rs. ${current?.totalRefunded || 0}.`
      );
    }

    // Structured audit logging
    console.log(
      JSON.stringify({
        event: isFullRefund ? 'ADMIN_COD_REFUND_RECORDED' : 'ADMIN_COD_PARTIAL_REFUND_RECORDED',
        orderId: updatedOrder._id.toString(),
        orderNumber: updatedOrder.orderNumber,
        paymentMethod: 'COD',
        previousPaymentStatus: existingOrder.paymentStatus,
        newPaymentStatus: validatedPayment,
        refundAmount: cleanAmount,
        totalRefunded: newTotalRefunded,
        remainingBalance: Math.max(0, Math.round((existingOrder.total - newTotalRefunded) * 100) / 100),
        orderTotal: existingOrder.total,
        adminId: adminUserId,
        timestamp: now.toISOString(),
      })
    );

    return await Order.findById(updatedOrder._id).populate('user', 'name email role');
  }

  throw createError(400, 'VALIDATION_ERROR', `Unsupported payment status: "${cleanNextPayment}".`);
}

/**
 * Admin stock reconciliation for cancelled orders.
 * Retries restoration only for items that have not yet been restored.
 * Idempotent and concurrency-safe.
 *
 * @param {string} orderId - Order ObjectId or orderNumber
 * @param {Object} options
 * @param {string} options.adminUserId - Authenticated administrator ID
 * @returns {Promise<{ order: Object, message: string, alreadyCompleted?: boolean }>}
 */
export async function reconcileStockForOrder(orderId, { adminUserId } = {}) {
  if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid administrator identity.');
  }

  const cleanId =
    orderId && (typeof orderId === 'string' ? orderId.trim() : orderId.toString ? orderId.toString().trim() : null);
  if (!cleanId) {
    throw createError(400, 'VALIDATION_ERROR', 'Order identifier is required.');
  }

  const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);
  const query = isObjectId
    ? { $or: [{ _id: cleanId }, { orderNumber: cleanId.toUpperCase() }] }
    : { orderNumber: cleanId.toUpperCase() };

  const existingOrder = await Order.findOne(query);
  if (!existingOrder) {
    throw createError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  if (existingOrder.orderStatus !== ORDER_STATUS.CANCELLED) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Stock reconciliation is only applicable to cancelled orders. Current status: "${existingOrder.orderStatus}".`
    );
  }

  // If already completed and no pending unrestored items, return early (idempotent)
  const unrestoredItems = existingOrder.items.filter((item) => !item.stockRestored);
  if (
    existingOrder.cancellation?.stockRestorationStatus === 'COMPLETED' ||
    unrestoredItems.length === 0
  ) {
    if (existingOrder.cancellation?.stockRestorationStatus !== 'COMPLETED') {
      await Order.updateOne(
        { _id: existingOrder._id },
        {
          $set: {
            'cancellation.stockRestorationStatus': 'COMPLETED',
            'cancellation.restorationErrors': [],
          },
        }
      );
    }
    const populated = await Order.findById(existingOrder._id).populate('user', 'name email role');
    return {
      order: populated,
      message: 'Stock restoration is already completed for all items in this order.',
      alreadyCompleted: true,
    };
  }

  // Crash-recoverable concurrency lock:
  // Lease expires after 60 seconds (or past leaseExpiresAt).
  // Monotonically increment fencing token.
  const now = new Date();
  const leaseDurationMs = 60 * 1000;
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
  const workerToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  const lockedOrder = await Order.findOneAndUpdate(
    {
      _id: existingOrder._id,
      orderStatus: ORDER_STATUS.CANCELLED,
      $or: [
        { 'cancellation.isReconciling': { $ne: true } },
        { 'cancellation.reconciliationLeaseExpiresAt': { $lte: now } },
      ],
    },
    {
      $set: {
        'cancellation.isReconciling': true,
        'cancellation.reconciliationToken': workerToken,
        'cancellation.reconciliationLeaseExpiresAt': leaseExpiresAt,
      },
      $inc: {
        'cancellation.reconciliationFencingToken': 1,
      },
    },
    { returnDocument: 'after' }
  );

  if (!lockedOrder) {
    const current = await Order.findById(existingOrder._id);
    if (current?.cancellation?.stockRestorationStatus === 'COMPLETED') {
      const populated = await Order.findById(current._id).populate('user', 'name email role');
      return {
        order: populated,
        message: 'Stock restoration is already completed for all items in this order.',
        alreadyCompleted: true,
      };
    }
    throw createError(
      409,
      'CONFLICT',
      'Stock reconciliation is currently in progress for this order. Please try again shortly.'
    );
  }

  const acquiredFencingToken = lockedOrder.cancellation?.reconciliationFencingToken;

  try {
    // restoreStockForOrder skips items where item.stockRestored === true
    // and performs atomic idempotent restoration on Product
    const restorationErrors = await restoreStockForOrder(
      lockedOrder.items,
      null,
      { orderId: lockedOrder._id, orderNumber: lockedOrder.orderNumber }
    );

    const hasAnyRestored = lockedOrder.items.some((i) => i.stockRestored);
    const allRestored = lockedOrder.items.every((i) => i.stockRestored);
    const newRestorationStatus = allRestored
      ? 'COMPLETED'
      : hasAnyRestored
      ? 'PARTIAL'
      : 'FAILED';

    // Fenced atomic write to Order: only succeed if lease token and fencing token still match!
    const updateRes = await Order.updateOne(
      {
        _id: lockedOrder._id,
        'cancellation.reconciliationToken': workerToken,
        'cancellation.reconciliationFencingToken': acquiredFencingToken,
      },
      {
        $set: {
          items: lockedOrder.items,
          'cancellation.stockRestorationStatus': newRestorationStatus,
          'cancellation.restorationErrors': restorationErrors,
          'cancellation.isReconciling': false,
          'cancellation.reconciliationToken': null,
          'cancellation.reconciliationLeaseExpiresAt': null,
        },
      }
    );

    if (updateRes.matchedCount === 0) {
      // Stale worker was fenced: another worker claimed an expired lease
      console.warn(
        JSON.stringify({
          event: 'STALE_RECONCILIATION_WORKER_FENCED',
          orderId: lockedOrder._id.toString(),
          workerToken,
          acquiredFencingToken,
          timestamp: new Date().toISOString(),
        })
      );
      const latestOrder = await Order.findById(lockedOrder._id).populate('user', 'name email role');
      return {
        order: latestOrder,
        message: 'Reconciliation lease expired before completion; order was reconciled by another worker.',
        alreadyCompleted: latestOrder?.cancellation?.stockRestorationStatus === 'COMPLETED',
      };
    }

    // Structured audit logging
    console.log(
      JSON.stringify({
        event: 'ADMIN_STOCK_RECONCILIATION_EXECUTED',
        orderId: lockedOrder._id.toString(),
        orderNumber: lockedOrder.orderNumber,
        adminId: adminUserId,
        workerToken,
        fencingToken: acquiredFencingToken,
        previousStatus: existingOrder.cancellation?.stockRestorationStatus || 'PENDING',
        newStatus: newRestorationStatus,
        restoredItemsCount: lockedOrder.items.filter((i) => i.stockRestored).length,
        totalItemsCount: lockedOrder.items.length,
        remainingFailuresCount: restorationErrors.length,
        timestamp: new Date().toISOString(),
      })
    );

    const populated = await Order.findById(lockedOrder._id).populate('user', 'name email role');
    return {
      order: populated,
      message:
        newRestorationStatus === 'COMPLETED'
          ? 'Stock successfully reconciled and restored for all items.'
          : `Stock reconciliation completed with ${restorationErrors.length} item(s) remaining unrestored.`,
      alreadyCompleted: false,
    };
  } catch (err) {
    // Safe release on unexpected error: only clear if we still hold the lease!
    await Order.updateOne(
      {
        _id: lockedOrder._id,
        'cancellation.reconciliationToken': workerToken,
        'cancellation.reconciliationFencingToken': acquiredFencingToken,
      },
      {
        $set: {
          'cancellation.isReconciling': false,
          'cancellation.reconciliationToken': null,
          'cancellation.reconciliationLeaseExpiresAt': null,
        },
      }
    );
    throw err;
  }
}

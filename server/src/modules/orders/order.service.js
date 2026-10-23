import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Order } from './order.model.js';
import { Cart } from '../cart/cart.model.js';
import { Product } from '../products/product.model.js';
import { validatePaymentMethod } from './payment.strategy.js';
import { createError } from '../../utils/createError.js';

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

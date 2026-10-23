import mongoose from 'mongoose';
import { Cart } from './cart.model.js';
import { Product } from '../products/product.model.js';
import { createError } from '../../utils/createError.js';

export const MIN_ITEM_QUANTITY = 1;
export const MAX_ITEM_QUANTITY = 10;
export const MAX_CART_ITEMS = 50;

/**
 * Generate a deterministic cart item key based on product ID and selected option.
 */
export function generateItemKey(productId, optionId) {
  const pId = typeof productId === 'string' ? productId.trim().toLowerCase() : String(productId).toLowerCase();
  if (optionId && typeof optionId === 'string' && optionId.trim()) {
    return `${pId}:${optionId.trim().toLowerCase()}`;
  }
  return pId;
}

/**
 * Validate and constrain an item quantity as a positive integer.
 * Strictly rejects booleans, arrays, objects, floats, or out-of-range values.
 */
export function parseQuantity(val) {
  if (typeof val !== 'number' && typeof val !== 'string') {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Quantity must be an integer between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}.`
    );
  }
  if (typeof val === 'string' && !/^\s*\d+\s*$/.test(val)) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Quantity must be an integer between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}.`
    );
  }
  const num = Number(val);
  if (!Number.isInteger(num) || num < MIN_ITEM_QUANTITY || num > MAX_ITEM_QUANTITY) {
    throw createError(
      400,
      'VALIDATION_ERROR',
      `Quantity must be an integer between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}.`
    );
  }
  return num;
}

/**
 * Empty cart response structure.
 */
export function formatEmptyCart() {
  return {
    items: [],
    itemCount: 0,
    subtotal: 0,
    total: 0,
  };
}

/**
 * Mutate a user's cart document with automatic retry on concurrent modification (VersionError).
 */
async function mutateCartWithRetry(userId, mutateFn, { createIfMissing = true, maxRetries = 3 } = {}) {
  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      if (!createIfMissing) {
        return null;
      }
      try {
        cart = await Cart.create({ user: userId, items: [] });
      } catch (err) {
        if (err.code === 11000) {
          cart = await Cart.findOne({ user: userId });
        } else {
          throw err;
        }
      }
    }

    try {
      await mutateFn(cart);
      await cart.save();
      return cart;
    } catch (err) {
      if (err.name === 'VersionError' && attempts < maxRetries) {
        continue;
      }
      if (err.name === 'VersionError') {
        throw createError(409, 'CONFLICT', 'Cart was modified concurrently. Please retry.');
      }
      throw err;
    }
  }
  throw createError(409, 'CONFLICT', 'Cart was modified concurrently. Please retry.');
}

/**
 * Calculate dynamic prices, totals, and stock availability for a cart.
 * Never trusts client totals or cached prices.
 */
export async function formatCartResponse(cartDoc) {
  if (!cartDoc || !Array.isArray(cartDoc.items) || cartDoc.items.length === 0) {
    return formatEmptyCart();
  }

  // Populate products with category information
  const productIds = cartDoc.items.map((it) => it.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } })
    .populate({
      path: 'category',
      select: 'name slug isActive',
    })
    .select('_id name slug price mrp stock images options isActive category');

  const productMap = new Map();
  for (const prod of products) {
    productMap.set(prod._id.toString(), prod);
  }

  const formattedItems = [];
  let calculatedSubtotal = 0;
  let totalItemCount = 0;

  for (const item of cartDoc.items) {
    const prod = productMap.get(item.product?.toString());
    const isProductActive = Boolean(prod && prod.isActive);
    const isCategoryActive = Boolean(prod?.category && prod.category.isActive);

    let unitPrice = 0;
    let selectedOption = null;
    let isOptionValid = true;

    if (prod) {
      unitPrice = prod.price;

      if (item.optionId) {
        const choice = prod.options?.choices?.find(
          (c) => c.id && c.id.trim().toLowerCase() === item.optionId.trim().toLowerCase()
        );
        if (choice) {
          selectedOption = {
            id: choice.id,
            name: choice.name,
            detail: choice.detail,
            priceDelta: choice.priceDelta || 0,
          };
          unitPrice = Math.max(0, unitPrice + (choice.priceDelta || 0));
        } else {
          isOptionValid = false;
        }
      }
    }

    unitPrice = Math.round(unitPrice * 100) / 100;
    const availableStock = prod ? prod.stock : 0;
    const hasEnoughStock = availableStock >= item.quantity;
    const isAvailable = Boolean(isProductActive && isCategoryActive && isOptionValid && hasEnoughStock);

    let availabilityReason = null;
    if (!prod) {
      availabilityReason = 'Product not found.';
    } else if (!isProductActive || !isCategoryActive) {
      availabilityReason = 'Product is currently unavailable.';
    } else if (!isOptionValid) {
      availabilityReason = 'Selected option is no longer available.';
    } else if (!hasEnoughStock) {
      availabilityReason = availableStock <= 0 ? 'Out of stock.' : `Only ${availableStock} units available in stock.`;
    }

    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;

    if (isAvailable) {
      calculatedSubtotal = Math.round((calculatedSubtotal + lineTotal) * 100) / 100;
      totalItemCount += item.quantity;
    }

    formattedItems.push({
      key: item.key,
      productId: prod ? prod._id.toString() : (item.product ? item.product.toString() : ''),
      name: prod ? prod.name : 'Unavailable Product',
      slug: prod ? prod.slug : null,
      image: prod?.images?.[0] || null,
      option: selectedOption,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
      stock: availableStock,
      isAvailable,
      availabilityReason,
    });
  }

  return {
    items: formattedItems,
    itemCount: totalItemCount,
    subtotal: calculatedSubtotal,
    total: calculatedSubtotal,
  };
}

/**
 * Fetch the authenticated user's cart with live calculation.
 */
export async function getCart(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return formatEmptyCart();
  }

  return formatCartResponse(cart);
}

/**
 * Add an item to the authenticated user's cart.
 * If the product + option combination already exists, increments the quantity.
 */
export async function addItem(userId, { productId, optionId, quantity = 1 } = {}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  if (typeof productId !== 'string' || !productId.trim() || productId.trim().length > 140) {
    throw createError(400, 'VALIDATION_ERROR', 'Product identifier is required.');
  }

  const addQty = parseQuantity(quantity);
  const trimmedProdId = productId.trim().toLowerCase();
  const isObjectId = mongoose.Types.ObjectId.isValid(trimmedProdId);

  const productFilter = { isActive: true };
  if (isObjectId) {
    productFilter.$or = [{ _id: trimmedProdId }, { slug: trimmedProdId }];
  } else {
    productFilter.slug = trimmedProdId;
  }

  const product = await Product.findOne(productFilter).populate({
    path: 'category',
    match: { isActive: true },
    select: 'name slug isActive',
  });

  if (!product || !product.category) {
    throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found or unavailable.');
  }

  // Validate option choice if supplied
  let validatedOptionId = null;
  if (optionId !== undefined && optionId !== null && optionId !== '') {
    if (typeof optionId !== 'string' || !optionId.trim() || optionId.trim().length > 100) {
      throw createError(400, 'VALIDATION_ERROR', 'Invalid option identifier.');
    }
    const cleanOptionId = optionId.trim().toLowerCase();
    const choice = product.options?.choices?.find(
      (c) => c.id && c.id.trim().toLowerCase() === cleanOptionId
    );
    if (!choice) {
      throw createError(400, 'VALIDATION_ERROR', 'Invalid option selected for product.');
    }
    validatedOptionId = choice.id.trim().toLowerCase();
  }

  const itemKey = generateItemKey(product._id, validatedOptionId);

  const savedCart = await mutateCartWithRetry(userId, (cart) => {
    const existingItem = cart.items.find((it) => it.key === itemKey);
    const currentQty = existingItem ? existingItem.quantity : 0;
    const targetQty = currentQty + addQty;

    if (!existingItem && cart.items.length >= MAX_CART_ITEMS) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Cart cannot contain more than ${MAX_CART_ITEMS} unique items.`
      );
    }

    if (targetQty > MAX_ITEM_QUANTITY) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Cannot add ${addQty} more. Maximum limit is ${MAX_ITEM_QUANTITY} units per item.`
      );
    }

    if (targetQty > product.stock) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Cannot add ${addQty} more. Only ${product.stock} units are currently available.`
      );
    }

    if (existingItem) {
      existingItem.quantity = targetQty;
    } else {
      cart.items.push({
        key: itemKey,
        product: product._id,
        optionId: validatedOptionId,
        quantity: targetQty,
      });
    }
  });

  return formatCartResponse(savedCart);
}

/**
 * Update the quantity of a specific cart item identified by its key.
 */
export async function updateItemQuantity(userId, key, quantity) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  if (typeof key !== 'string' || !key.trim() || key.trim().length > 200) {
    throw createError(400, 'VALIDATION_ERROR', 'Item key is required.');
  }

  const newQty = parseQuantity(quantity);
  const cleanKey = key.trim().toLowerCase();

  const savedCart = await mutateCartWithRetry(
    userId,
    async (cart) => {
      const item = cart.items.find((it) => it.key === cleanKey);
      if (!item) {
        throw createError(404, 'ITEM_NOT_FOUND', 'Item not found in cart.');
      }

      // Verify stock and active category
      const product = await Product.findOne({ _id: item.product, isActive: true }).populate({
        path: 'category',
        match: { isActive: true },
        select: 'isActive',
      });
      if (!product || !product.category) {
        throw createError(400, 'VALIDATION_ERROR', 'Product is no longer available.');
      }

      if (item.optionId) {
        const choice = product.options?.choices?.find(
          (c) => c.id && c.id.trim().toLowerCase() === item.optionId.trim().toLowerCase()
        );
        if (!choice) {
          throw createError(400, 'VALIDATION_ERROR', 'Selected option is no longer available.');
        }
      }

      if (newQty > product.stock) {
        throw createError(
          400,
          'VALIDATION_ERROR',
          `Requested quantity (${newQty}) exceeds available stock (${product.stock}).`
        );
      }

      item.quantity = newQty;
    },
    { createIfMissing: false }
  );

  if (!savedCart) {
    throw createError(404, 'ITEM_NOT_FOUND', 'Item not found in cart.');
  }

  return formatCartResponse(savedCart);
}

/**
 * Remove an item from the cart by its key.
 */
export async function removeItem(userId, key) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  if (typeof key !== 'string' || !key.trim() || key.trim().length > 200) {
    throw createError(400, 'VALIDATION_ERROR', 'Item key is required.');
  }

  const cleanKey = key.trim().toLowerCase();

  const savedCart = await mutateCartWithRetry(
    userId,
    (cart) => {
      const initialLength = cart.items.length;
      cart.items = cart.items.filter((it) => it.key !== cleanKey);

      if (cart.items.length === initialLength) {
        throw createError(404, 'ITEM_NOT_FOUND', 'Item not found in cart.');
      }
    },
    { createIfMissing: false }
  );

  if (!savedCart) {
    throw createError(404, 'ITEM_NOT_FOUND', 'Item not found in cart.');
  }

  return formatCartResponse(savedCart);
}

/**
 * Clear all items from the authenticated user's cart.
 */
export async function clearCart(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  }

  await mutateCartWithRetry(
    userId,
    (cart) => {
      if (cart.items.length > 0) {
        cart.items = [];
      }
    },
    { createIfMissing: false }
  );

  return formatEmptyCart();
}

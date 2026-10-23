import * as cartService from './cart.service.js';

/**
 * Handle fetching the authenticated user's cart.
 */
export async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        cart,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle adding an item to the authenticated user's cart.
 */
export async function addItem(req, res, next) {
  try {
    const { productId, optionId, quantity } = req.body || {};
    const cart = await cartService.addItem(req.user.id, { productId, optionId, quantity });
    res.status(200).json({
      success: true,
      data: {
        cart,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle updating the quantity of a cart item.
 */
export async function updateItemQuantity(req, res, next) {
  try {
    const { key } = req.params;
    const { quantity } = req.body || {};
    const cart = await cartService.updateItemQuantity(req.user.id, key, quantity);
    res.status(200).json({
      success: true,
      data: {
        cart,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle removing a single item from the cart.
 */
export async function removeItem(req, res, next) {
  try {
    const { key } = req.params;
    const cart = await cartService.removeItem(req.user.id, key);
    res.status(200).json({
      success: true,
      data: {
        cart,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle clearing all items from the cart.
 */
export async function clearCart(req, res, next) {
  try {
    const cart = await cartService.clearCart(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        cart,
      },
    });
  } catch (err) {
    next(err);
  }
}

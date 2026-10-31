import mongoose from 'mongoose';
import { Coupon, CouponRedemption } from './coupon.model.js';
import { Product } from '../products/product.model.js';
import { Category } from '../categories/category.model.js';
import { Cart } from '../cart/cart.model.js';
import { formatCartResponse } from '../cart/cart.service.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError, toDuplicateKeyError } from '../../utils/duplicateKeyError.js';

const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const invalid = (message) => createError(400, 'COUPON_INVALID', message);

function validateCouponFields(input, { creating = false } = {}) {
  const fields = {};
  const code = input.code;
  if (creating) {
    if (typeof code !== 'string' || !/^[a-zA-Z0-9_-]{3,32}$/.test(code.trim())) throw createError(400, 'VALIDATION_ERROR', 'Coupon code must be 3 to 32 letters, numbers, hyphens or underscores.');
    fields.code = code.trim().toUpperCase();
  } else if ('code' in input) throw createError(400, 'VALIDATION_ERROR', 'Coupon code cannot be edited.');
  if (creating || 'discountType' in input) {
    if (!['PERCENT', 'FIXED'].includes(input.discountType)) throw createError(400, 'VALIDATION_ERROR', 'Discount type must be PERCENT or FIXED.');
    fields.discountType = input.discountType;
  }
  if (creating || 'value' in input) {
    if (typeof input.value !== 'number' || !Number.isFinite(input.value) || input.value <= 0 || (input.discountType === 'PERCENT' && input.value > 100)) throw createError(400, 'VALIDATION_ERROR', 'Discount value must be positive, and a percentage cannot exceed 100.');
    fields.value = input.value;
  }
  for (const name of ['minOrderAmount', 'maxDiscountAmount']) {
    if (creating || name in input) {
      const value = input[name];
      if (value === null && name === 'maxDiscountAmount') fields[name] = null;
      else if (typeof value !== 'number' || !Number.isFinite(value) || value < (name === 'maxDiscountAmount' ? 0.01 : 0)) throw createError(400, 'VALIDATION_ERROR', `${name} must be a valid non-negative amount.`);
      else fields[name] = value;
    }
  }
  for (const name of ['startsAt', 'expiresAt']) {
    if (creating || name in input) {
      const value = new Date(input[name]);
      if (!input[name] || Number.isNaN(value.getTime())) throw createError(400, 'VALIDATION_ERROR', `${name} must be a valid date.`);
      fields[name] = value;
    }
  }
  if (creating || 'usageLimit' in input) {
    const value = input.usageLimit;
    if (value === null) fields.usageLimit = null;
    else if (!Number.isInteger(value) || value < 1) throw createError(400, 'VALIDATION_ERROR', 'usageLimit must be a positive integer or null.');
    else fields.usageLimit = value;
  }
  if (creating || 'perCustomerLimit' in input) {
    const value = input.perCustomerLimit ?? 1;
    if (!Number.isInteger(value) || value < 1 || value > 100) throw createError(400, 'VALIDATION_ERROR', 'perCustomerLimit must be an integer from 1 to 100.');
    fields.perCustomerLimit = value;
  }
  if (creating || 'isActive' in input) {
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw createError(400, 'VALIDATION_ERROR', 'isActive must be a boolean.');
    fields.isActive = input.isActive ?? true;
  }
  for (const name of ['eligibleProducts', 'eligibleCategories']) {
    if (creating || name in input) {
      const list = input[name] ?? [];
      if (!Array.isArray(list) || list.length > 100 || list.some((id) => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id))) throw createError(400, 'VALIDATION_ERROR', `${name} must contain valid ids (maximum 100).`);
      if (list.length > 0) throw createError(409, 'COUPON_ELIGIBILITY_UNAVAILABLE', 'Product/category-restricted coupons are not available until the admin selection workflow is implemented and verified.');
      fields[name] = [...new Set(list)];
    }
  }
  const startsAt = fields.startsAt;
  const expiresAt = fields.expiresAt;
  if (startsAt && expiresAt && expiresAt <= startsAt) throw createError(400, 'VALIDATION_ERROR', 'expiresAt must be after startsAt.');
  if ((fields.discountType ?? input.discountType) === 'FIXED' && fields.maxDiscountAmount !== undefined && fields.maxDiscountAmount !== null) throw createError(400, 'VALIDATION_ERROR', 'maxDiscountAmount applies only to percentage coupons.');
  return fields;
}

async function eligibleSubtotal(coupon, items) {
  let eligible = items;
  if (coupon.eligibleProducts?.length || coupon.eligibleCategories?.length) {
    const ids = items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: ids } }).select('_id category');
    const categories = coupon.eligibleCategories?.length
      ? await Category.find({ _id: { $in: coupon.eligibleCategories }, isActive: true }).distinct('_id')
      : [];
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    eligible = items.filter((item) => {
      const product = productMap.get(String(item.product));
      return (coupon.eligibleProducts?.some((id) => String(id) === String(item.product))) || (categories.some((id) => String(id) === String(product?.category)));
    });
  }
  return money(eligible.reduce((total, item) => total + item.unitPrice * item.quantity, 0));
}

export async function calculateCoupon(userId, code, { subtotal, items, session } = {}) {
  if (typeof code !== 'string' || !/^[a-zA-Z0-9_-]{3,32}$/.test(code.trim())) throw invalid('Enter a valid coupon code.');
  const now = new Date();
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() }).session(session ?? null);
  if (!coupon || !coupon.isActive || now < coupon.startsAt || now >= coupon.expiresAt) throw invalid('This coupon is invalid or expired.');
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) throw invalid('This coupon has reached its usage limit.');
  const usedByCustomer = await CouponRedemption.countDocuments({ coupon: coupon._id, user: userId }).session(session ?? null);
  if (usedByCustomer >= coupon.perCustomerLimit) throw invalid('You have already used this coupon the maximum number of times.');
  if (subtotal < coupon.minOrderAmount) throw invalid(`This coupon requires an order subtotal of at least ${coupon.minOrderAmount}.`);
  const eligible = await eligibleSubtotal(coupon, items ?? []);
  if (eligible <= 0) throw invalid('This coupon does not apply to items in your cart.');
  const raw = coupon.discountType === 'PERCENT' ? eligible * coupon.value / 100 : coupon.value;
  const discount = money(Math.min(eligible, coupon.discountType === 'PERCENT' && coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw));
  return { coupon, discount, eligibleSubtotal: eligible };
}

export async function quoteCoupon(userId, code) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) throw invalid('Add items to your cart before applying a coupon.');
  const formatted = await formatCartResponse(cart);
  if (formatted.items.some((item) => !item.isAvailable)) throw invalid('Fix unavailable cart items before applying a coupon.');
  const items = formatted.items.map((item) => ({ product: item.productId, unitPrice: item.unitPrice, quantity: item.quantity }));
  const { coupon, discount } = await calculateCoupon(userId, code, { subtotal: formatted.subtotal, items });
  return { code: coupon.code, discount, subtotal: formatted.subtotal, total: money(formatted.subtotal - discount) };
}

export async function reserveCoupon(quote, userId, orderId, session) {
  if (!quote) return;
  if (!session) throw createError(503, 'COUPON_REQUIRES_TRANSACTION', 'Coupon checkout requires a transaction-capable database.');
  const now = new Date();
  const res = await Coupon.updateOne({
    _id: quote.coupon._id,
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
    $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }],
  }, { $inc: { usageCount: 1 } }, { session });
  if (!res.modifiedCount) throw invalid('This coupon is no longer available.');
  const count = await CouponRedemption.countDocuments({ coupon: quote.coupon._id, user: userId }).session(session);
  if (count >= quote.coupon.perCustomerLimit) throw invalid('You have already used this coupon the maximum number of times.');
  await CouponRedemption.create([{ coupon: quote.coupon._id, user: userId, order: orderId, discount: quote.discount }], { session });
}

export async function listCoupons() {
  return Coupon.find({}).sort({ createdAt: -1 }).limit(200);
}

export async function createCoupon(input) {
  const fields = validateCouponFields(input, { creating: true });
  if (fields.discountType === 'PERCENT' && fields.value > 100) throw createError(400, 'VALIDATION_ERROR', 'A percentage discount cannot exceed 100.');
  try { return await Coupon.create(fields); }
  catch (err) { if (isDuplicateKeyError(err)) throw toDuplicateKeyError(err); throw err; }
}

export async function updateCoupon(id, input) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, 'VALIDATION_ERROR', 'Coupon id is invalid.');
  const fields = validateCouponFields(input);
  if (!Object.keys(fields).length) throw createError(400, 'VALIDATION_ERROR', 'Provide coupon fields to update.');
  const existing = await Coupon.findById(id);
  if (!existing) throw createError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
  const next = { ...existing.toObject(), ...fields };
  if (next.expiresAt <= next.startsAt || (next.discountType === 'PERCENT' && next.value > 100)) throw createError(400, 'VALIDATION_ERROR', 'Coupon values or date range are invalid.');
  return Coupon.findByIdAndUpdate(id, { $set: fields }, { returnDocument: 'after', runValidators: true });
}

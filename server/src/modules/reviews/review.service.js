import mongoose from 'mongoose';
import { Review } from './review.model.js';
import { Product } from '../products/product.model.js';
import { Order } from '../orders/order.model.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import { getPublicCategoryById } from '../categories/cataloguePolicy.js';

async function publicProduct(slug) {
  const product = await Product.findOne({ slug, isActive: true, status: { $in: ['active', null] } }).select('_id category');
  if (!product || !(await getPublicCategoryById(product.category))) return null;
  return product;
}

function boundedInt(value, fallback, max) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw createError(400, 'VALIDATION_ERROR', 'Pagination values must be positive integers.');
  return Math.min(n, max);
}

export async function listPublicReviews(slug, query = {}) {
  const product = await publicProduct(slug);
  if (!product?.category) throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  const page = boundedInt(query.page, 1, 10000);
  const limit = boundedInt(query.limit, 10, 50);
  const filter = { product: product._id, status: 'APPROVED' };
  const [reviews, summary, total] = await Promise.all([
    Review.find(filter).populate('user', 'name').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select('rating title body createdAt user'),
    Review.aggregate([{ $match: filter }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Review.countDocuments(filter),
  ]);
  return {
    reviews: reviews.map((review) => ({ id: String(review._id), rating: review.rating, title: review.title, body: review.body, author: review.user?.name ?? 'Customer', createdAt: review.createdAt })),
    summary: { average: summary[0]?.average ?? 0, count: summary[0]?.count ?? 0 },
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
  };
}

export async function createProductReview(userId, slug, input = {}) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw createError(401, 'INVALID_TOKEN', 'Invalid user identity.');
  const product = await publicProduct(slug);
  if (!product?.category) throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  const rating = input.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw createError(400, 'VALIDATION_ERROR', 'Rating must be an integer from 1 to 5.');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (title.length > 100 || body.length < 10 || body.length > 2000) throw createError(400, 'VALIDATION_ERROR', 'Review title must be 100 characters or fewer and review text must be 10 to 2000 characters.');
  const purchased = await Order.exists({ user: userId, orderStatus: 'DELIVERED', 'items.product': product._id });
  if (!purchased) throw createError(403, 'REVIEW_PURCHASE_REQUIRED', 'A delivered order containing this product is required to review it.');
  try {
    const review = await Review.create({ product: product._id, user: userId, rating, title, body, status: 'PENDING' });
    return { id: String(review._id), status: review.status, message: 'Review submitted for moderation.' };
  } catch (err) {
    if (isDuplicateKeyError(err)) throw createError(409, 'REVIEW_EXISTS', 'You have already submitted a review for this product.');
    throw err;
  }
}

export async function listAdminReviews(query = {}) {
  const page = boundedInt(query.page, 1, 10000);
  const limit = boundedInt(query.limit, 25, 100);
  const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'all'];
  const status = typeof query.status === 'string' ? query.status.toUpperCase() : 'PENDING';
  if (!statuses.includes(status)) throw createError(400, 'VALIDATION_ERROR', 'Review status is invalid.');
  const filter = status === 'all' ? {} : { status };
  const [reviews, total] = await Promise.all([
    Review.find(filter).populate('product', 'name slug').populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Review.countDocuments(filter),
  ]);
  return { reviews, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function moderateReview(id, { status, adminId } = {}) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, 'VALIDATION_ERROR', 'Review id is invalid.');
  if (!mongoose.Types.ObjectId.isValid(adminId)) throw createError(401, 'INVALID_TOKEN', 'Invalid administrator identity.');
  const next = typeof status === 'string' ? status.toUpperCase() : '';
  if (!['APPROVED', 'REJECTED', 'HIDDEN'].includes(next)) throw createError(400, 'VALIDATION_ERROR', 'Status must be APPROVED, REJECTED or HIDDEN.');
  const review = await Review.findByIdAndUpdate(id, { $set: { status: next, moderatedBy: adminId, moderatedAt: new Date() } }, { returnDocument: 'after', runValidators: true })
    .populate('product', 'name slug').populate('user', 'name email');
  if (!review) throw createError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
  return review;
}

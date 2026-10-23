import mongoose from 'mongoose';
import { Product } from './product.model.js';
import { Category } from '../categories/category.model.js';
import { createError } from '../../utils/createError.js';

const SORT_MAP = Object.freeze({
  'featured': { isFeatured: -1, createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'rating': { rating: -1, reviewCount: -1 },
  'popular': { soldCount: -1 },
  'newest': { createdAt: -1 },
  'name': { name: 1 },
});

/**
 * Escape regex special characters to prevent ReDoS or query injection.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse and constrain a positive integer parameter.
 */
function parseBoundedInt(val, fallback, min, max) {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  if (!Number.isInteger(num) || num < min) return fallback;
  if (num > max) return max;
  return num;
}

/**
 * List products with bounded pagination, allowlisted sorting, and safe filtering.
 */
export async function listProducts(queryParams = {}) {
  const page = parseBoundedInt(queryParams.page, 1, 1, 10000);
  const limit = parseBoundedInt(queryParams.limit, 12, 1, 50);

  const filter = { isActive: true };

  // Category filter: ensure only active categories are matched and referenced
  if (typeof queryParams.category === 'string' && queryParams.category.trim()) {
    const cat = queryParams.category.trim().toLowerCase().slice(0, 80);
    const isObjectId = mongoose.Types.ObjectId.isValid(cat);
    const categoryDoc = await Category.findOne(
      isObjectId ? { $or: [{ _id: cat }, { slug: cat }], isActive: true } : { slug: cat, isActive: true }
    ).select('_id');

    if (!categoryDoc) {
      return {
        products: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
    filter.category = categoryDoc._id;
  } else {
    const activeCategoryIds = await Category.find({ isActive: true }).distinct('_id');
    filter.category = { $in: activeCategoryIds };
  }

  // Tag filter
  if (typeof queryParams.tag === 'string' && queryParams.tag.trim()) {
    filter.tags = queryParams.tag.trim().toLowerCase().slice(0, 50);
  }

  // In-stock filter
  if (queryParams.inStock === 'true' || queryParams.inStock === true) {
    filter.stock = { $gt: 0 };
  }

  // Featured filter
  if (queryParams.featured === 'true' || queryParams.featured === true) {
    filter.isFeatured = true;
  }

  // Validate and apply price range filters
  let min = null;
  let max = null;

  if (queryParams.priceMin !== undefined && queryParams.priceMin !== '') {
    min = Number(queryParams.priceMin);
    if (Number.isNaN(min) || min < 0) {
      throw createError(400, 'VALIDATION_ERROR', 'priceMin must be a non-negative number.');
    }
  }

  if (queryParams.priceMax !== undefined && queryParams.priceMax !== '') {
    max = Number(queryParams.priceMax);
    if (Number.isNaN(max) || max < 0) {
      throw createError(400, 'VALIDATION_ERROR', 'priceMax must be a non-negative number.');
    }
  }

  if (min !== null && max !== null) {
    if (min > max) {
      throw createError(400, 'VALIDATION_ERROR', 'priceMin cannot be greater than priceMax.');
    }
    filter.price = { $gte: min, $lte: max };
  } else if (min !== null) {
    filter.price = { $gte: min };
  } else if (max !== null) {
    filter.price = { $lte: max };
  }

  // Safe search on name and summary
  const search = typeof queryParams.search === 'string' ? queryParams.search : queryParams.q;
  if (typeof search === 'string' && search.trim()) {
    const safeTerm = escapeRegex(search.trim().slice(0, 100));
    filter.$or = [
      { name: { $regex: safeTerm, $options: 'i' } },
      { summary: { $regex: safeTerm, $options: 'i' } },
    ];
  }

  // Allowlisted sort
  const sortKey = typeof queryParams.sort === 'string' ? queryParams.sort.trim().toLowerCase() : 'featured';
  const sortCriteria = SORT_MAP[sortKey] || SORT_MAP.featured;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug shortName')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .select(
        '_id name slug summary category categorySlug price mrp stock images tags rating reviewCount soldCount isFeatured light size highlights options'
      ),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Get an active product by slug or MongoDB ObjectId.
 */
export async function getProductBySlugOrId(slugOrId) {
  if (typeof slugOrId !== 'string' || !slugOrId.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Product identifier is required.');
  }

  const trimmed = slugOrId.trim().slice(0, 140).toLowerCase();
  const isObjectId = mongoose.Types.ObjectId.isValid(trimmed);

  const filter = { isActive: true };
  if (isObjectId) {
    filter.$or = [{ _id: trimmed }, { slug: trimmed }];
  } else {
    filter.slug = trimmed;
  }

  let product;
  try {
    product = await Product.findOne(filter)
      .populate({
        path: 'category',
        match: { isActive: true },
        select: 'name slug shortName',
      })
      .select('-isActive');
  } catch {
    throw createError(400, 'VALIDATION_ERROR', 'Invalid product identifier.');
  }

  if (!product || !product.category) {
    throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  }

  return product;
}

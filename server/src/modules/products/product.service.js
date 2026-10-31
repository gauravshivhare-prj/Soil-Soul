import mongoose from 'mongoose';
import { Product } from './product.model.js';
import { getPublicCatalogueCategories, getPublicCategoryById } from '../categories/cataloguePolicy.js';
import { createError } from '../../utils/createError.js';

const SORT_MAP = Object.freeze({
  'featured': { isFeatured: -1, createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  // 'rating' is not offered until genuine reviews exist (P9); it falls back to the default sort.
  'popular': { soldCount: -1 },
  'newest': { createdAt: -1 },
  'name': { name: 1 },
});

// Hand-entered rating/reviewCount stay stored but are not public until genuine reviews exist (P9).
// archivedAt and sku are admin-only catalog fields.
const PUBLIC_DETAIL_EXCLUDED_FIELDS = '-isActive -rating -reviewCount -archivedAt -sku';

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
  if (typeof val !== 'string' && typeof val !== 'number') {
    throw createError(400, 'VALIDATION_ERROR', 'Pagination values must be integers.');
  }
  const num = Number(val);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw createError(400, 'VALIDATION_ERROR', `Pagination values must be between ${min} and ${max}.`);
  }
  return num;
}

function listParam(value, field, { maxItems = 20, maxLength = 50 } = {}) {
  if (value === undefined || value === null || value === '') return [];
  if (typeof value !== 'string') throw createError(400, 'VALIDATION_ERROR', `${field} must be a comma-separated string.`);
  const values = [...new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))];
  if (values.length > maxItems || values.some((item) => item.length > maxLength)) {
    throw createError(400, 'VALIDATION_ERROR', `${field} has too many or overlong values.`);
  }
  return values;
}

/**
 * Public view of variants: only choices that are available to buy, without internal SKUs
 * (the product-level SKU is likewise hidden from public responses). Mutates the loaded document.
 */
function toPublicVariants(product) {
  const choices = product?.options?.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    product.options.choices = choices.filter((choice) => choice.isActive !== false);
    for (const choice of product.options.choices) choice.sku = undefined;
  }
  return product;
}

/**
 * List products with bounded pagination, allowlisted sorting, and safe filtering.
 */
export async function listProducts(queryParams = {}) {
  const page = parseBoundedInt(queryParams.page, 1, 1, 10000);
  const limit = parseBoundedInt(queryParams.limit, 12, 1, 50);

  const filter = { isActive: true, status: { $in: ['active', null] } };

  // Category filter: active valid category ancestry, then all active descendants.
  const publicCategories = await getPublicCatalogueCategories();
  const publicCategoryById = new Map(publicCategories.map((category) => [String(category._id), category]));
  const categoryIds = publicCategories.map((category) => category._id);
  const requestedCategories = listParam(queryParams.category, 'category', { maxLength: 80 });
  if (requestedCategories.length > 0) {
    const selected = requestedCategories.map((value) => publicCategories.find((category) => category.slug === value || String(category._id) === value)).filter(Boolean);
    if (selected.length === 0) {
      return { products: [], pagination: { page, limit, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: page > 1 } };
    }
    const visited = new Set(selected.map((category) => String(category._id)));
    let level = [...visited];
    for (let depth = 0; depth < 10 && level.length > 0; depth++) {
      const children = publicCategories.filter((category) => category.parent && level.includes(String(category.parent.id)));
      level = children.map((category) => String(category._id)).filter((id) => !visited.has(id));
      for (const id of level) visited.add(id);
    }
    filter.category = { $in: [...visited].map((id) => publicCategoryById.get(id)._id) };
  } else {
    filter.category = { $in: categoryIds };
  }

  const tags = listParam(queryParams.tag, 'tag');
  const lights = listParam(queryParams.light, 'light');
  const sizes = listParam(queryParams.size, 'size');
  if (tags.length) filter.tags = { $in: tags };
  if (lights.length) filter.light = { $in: lights };
  if (sizes.length) filter.size = { $in: sizes };

  // In-stock filter
  if (queryParams.inStock === 'true' || queryParams.inStock === true) {
    // Something sellable (same rule as checkout): product-level stock when there are no variants,
    // an active variant with its own stock, or an active variant without its own stock (it sells
    // from the product's shared stock) while that shared stock is above zero.
    filter.$and = [
      ...(filter.$and ?? []),
      {
        $or: [
          { 'options.choices.0': { $exists: false }, stock: { $gt: 0 } },
          { 'options.choices': { $elemMatch: { stock: { $gt: 0 }, isActive: { $ne: false } } } },
          { stock: { $gt: 0 }, 'options.choices': { $elemMatch: { stock: null, isActive: { $ne: false } } } },
        ],
      },
    ];
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
    if (!Number.isFinite(min) || min < 0) {
      throw createError(400, 'VALIDATION_ERROR', 'priceMin must be a finite non-negative number.');
    }
  }

  if (queryParams.priceMax !== undefined && queryParams.priceMax !== '') {
    max = Number(queryParams.priceMax);
    if (!Number.isFinite(max) || max < 0) {
      throw createError(400, 'VALIDATION_ERROR', 'priceMax must be a finite non-negative number.');
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

  // Safe, case-insensitive search across public catalogue text and supported attributes.
  const search = queryParams.search ?? queryParams.q;
  if (search !== undefined && typeof search !== 'string') {
    throw createError(400, 'VALIDATION_ERROR', 'search must be a string.');
  }
  if (typeof search === 'string' && search.trim()) {
    if (search.length > 100) throw createError(400, 'VALIDATION_ERROR', 'search cannot exceed 100 characters.');
    const terms = search.trim().replace(/\s+/g, ' ').split(' ');
    if (terms.length > 8) throw createError(400, 'VALIDATION_ERROR', 'search cannot contain more than 8 terms.');
    const fields = ['name', 'summary', 'tags', 'light', 'size', 'categorySlug'];
    filter.$and = [
      ...(filter.$and ?? []),
      ...terms.map((term) => {
        const safeTerm = escapeRegex(term);
        return {
          $or: fields.map((field) => ({ [field]: { $regex: safeTerm, $options: 'i' } })),
        };
      }),
    ];
  }

  // Allowlisted sort
  const sortKey = typeof queryParams.sort === 'string' ? queryParams.sort.trim().toLowerCase() : 'featured';
  if (queryParams.sort !== undefined && !SORT_MAP[sortKey]) {
    throw createError(400, 'VALIDATION_ERROR', 'sort is not supported.');
  }
  const sortCriteria = SORT_MAP[sortKey] || SORT_MAP.featured;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug shortName parent')
      .populate({ path: 'category', populate: { path: 'parent', select: 'name slug shortName parent' } })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .select('_id name slug summary category categorySlug price mrp stock images tags soldCount isFeatured light size highlights options status'),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    products: products.map(toPublicVariants),
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

/** Facet options for public filters; aggregation stays server-side and visibility-scoped. */
export async function getPublicProductFacets() {
  const activeCategories = await getPublicCatalogueCategories();
  const activeCategoryIds = activeCategories.map((category) => category._id);
  if (!activeCategoryIds.length) return { tags: [], light: [], sizes: [], categories: [], priceMin: 0, priceMax: 0 };
  const [facets = {}] = await Product.aggregate([
    { $match: { isActive: true, status: { $in: ['active', null] }, category: { $in: activeCategoryIds } } },
    { $facet: {
      tags: [{ $unwind: '$tags' }, { $group: { _id: '$tags' } }, { $sort: { _id: 1 } }, { $limit: 100 }],
      light: [{ $match: { light: { $type: 'string', $ne: '' } } }, { $group: { _id: '$light' } }, { $sort: { _id: 1 } }],
      sizes: [{ $match: { size: { $type: 'string', $ne: '' } } }, { $group: { _id: '$size' } }, { $sort: { _id: 1 } }],
      categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
      prices: [{ $match: { price: { $type: 'number', $gte: 0 } } }, { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
    } },
  ]);
  const directCounts = new Map((facets.categories ?? []).map(({ _id, count }) => [String(_id), count]));
  const categoryCounts = activeCategories.map((category) => {
    let count = 0;
    for (const candidate of activeCategories) {
      let current = candidate;
      const seen = new Set();
      for (let depth = 0; current && depth <= 10; depth++) {
        const id = String(current._id);
        if (seen.has(id)) break;
        seen.add(id);
        if (id === String(category._id)) { count += directCounts.get(String(candidate._id)) ?? 0; break; }
        current = current.parent ? activeCategories.find((item) => String(item._id) === String(current.parent.id)) : null;
      }
    }
    return { id: String(category._id), count };
  });
  return {
    tags: (facets.tags ?? []).map((x) => x._id),
    light: (facets.light ?? []).map((x) => x._id),
    sizes: (facets.sizes ?? []).map((x) => x._id),
    categories: categoryCounts,
    priceMin: facets.prices?.[0]?.min ?? 0,
    priceMax: facets.prices?.[0]?.max ?? 0,
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

  const filter = { isActive: true, status: { $in: ['active', null] } };
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
        select: 'name slug shortName parent',
        populate: { path: 'parent', select: 'name slug shortName parent' },
      })
      .select(PUBLIC_DETAIL_EXCLUDED_FIELDS);
  } catch {
    throw createError(400, 'VALIDATION_ERROR', 'Invalid product identifier.');
  }

  if (!product || !product.category) {
    throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  }
  if (!(await getPublicCategoryById(product.category._id))) {
    throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  }
  toPublicVariants(product);

  return product;
}

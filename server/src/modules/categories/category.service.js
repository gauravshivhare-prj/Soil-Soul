import mongoose from 'mongoose';
import { Category } from './category.model.js';
import { createError } from '../../utils/createError.js';

/**
 * List all active categories sorted by displayOrder.
 */
export async function listCategories() {
  return Category.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .select('_id name slug shortName tagline description image displayOrder');
}

/**
 * Get an active category by its slug or MongoDB ObjectId.
 */
export async function getCategoryBySlugOrId(slugOrId) {
  if (typeof slugOrId !== 'string' || !slugOrId.trim()) {
    throw createError(400, 'VALIDATION_ERROR', 'Category identifier is required.');
  }

  const trimmed = slugOrId.trim().slice(0, 100).toLowerCase();
  const isObjectId = mongoose.Types.ObjectId.isValid(trimmed);

  const filter = { isActive: true };
  if (isObjectId) {
    filter.$or = [{ _id: trimmed }, { slug: trimmed }];
  } else {
    filter.slug = trimmed;
  }

  let category;
  try {
    category = await Category.findOne(filter).select(
      '_id name slug shortName tagline description image displayOrder'
    );
  } catch {
    throw createError(400, 'VALIDATION_ERROR', 'Invalid category identifier.');
  }

  if (!category) {
    throw createError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  }

  return category;
}

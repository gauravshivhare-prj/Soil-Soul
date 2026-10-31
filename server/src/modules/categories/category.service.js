import mongoose from 'mongoose';
import { createError } from '../../utils/createError.js';
import { getPublicCatalogueCategories } from './cataloguePolicy.js';

/**
 * List all active categories sorted by displayOrder.
 */
export async function listCategories() {
  return getPublicCatalogueCategories();
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

  let category;
  try {
    const categories = await getPublicCatalogueCategories();
    category = categories.find((item) => (isObjectId ? String(item._id) === trimmed || item.slug === trimmed : item.slug === trimmed));
  } catch {
    throw createError(400, 'VALIDATION_ERROR', 'Invalid category identifier.');
  }

  if (!category) {
    throw createError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  }

  return category;
}

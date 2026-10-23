import * as categoryService from './category.service.js';

/**
 * Handle listing active categories.
 */
export async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.listCategories();
    res.status(200).json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle fetching a single category by slug or ID.
 */
export async function getCategory(req, res, next) {
  try {
    const { slug } = req.params;
    const category = await categoryService.getCategoryBySlugOrId(slug);
    res.status(200).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (err) {
    next(err);
  }
}

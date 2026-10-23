import * as productService from './product.service.js';

/**
 * Handle listing products with pagination, filtering, and sorting.
 */
export async function getProducts(req, res, next) {
  try {
    const result = await productService.listProducts(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle fetching a single product by slug or ID.
 */
export async function getProduct(req, res, next) {
  try {
    const { slug } = req.params;
    const product = await productService.getProductBySlugOrId(slug);
    res.status(200).json({
      success: true,
      data: {
        product,
      },
    });
  } catch (err) {
    next(err);
  }
}

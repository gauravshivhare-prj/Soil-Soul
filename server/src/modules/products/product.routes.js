import { Router } from 'express';
import * as productController from './product.controller.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as reviewController from '../reviews/review.controller.js';

const router = Router();

// Public read-only endpoints
router.get('/', productController.getProducts);
router.get('/facets', productController.getProductFacets);
router.get('/:slug/reviews', reviewController.getProductReviews);
router.post('/:slug/reviews', authenticate, authorize('customer'), reviewController.createProductReview);
router.get('/:slug', productController.getProduct);

export default router;

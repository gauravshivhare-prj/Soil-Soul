import { Router } from 'express';
import * as productController from './product.controller.js';

const router = Router();

// Public read-only endpoints
router.get('/', productController.getProducts);
router.get('/:slug', productController.getProduct);

export default router;

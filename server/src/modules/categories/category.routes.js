import { Router } from 'express';
import * as categoryController from './category.controller.js';

const router = Router();

// Public read-only endpoints
router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategory);

export default router;

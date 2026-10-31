import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as reviewController from './review.controller.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', reviewController.getAdminReviews);
router.patch('/:id', reviewController.moderateReview);
export default router;

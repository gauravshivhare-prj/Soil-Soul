import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as couponController from './coupon.controller.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', couponController.listCoupons);
router.post('/', couponController.createCoupon);
router.patch('/:id', couponController.updateCoupon);
export default router;

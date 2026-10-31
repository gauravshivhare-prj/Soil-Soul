import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as couponController from './coupon.controller.js';

const router = Router();
router.post('/quote', authenticate, couponController.quoteCoupon);
export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as orderController from './order.controller.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', orderController.getAdminReturns);
router.patch('/:id', orderController.updateAdminReturn);
router.post('/:id/record-refund', orderController.recordReturnRefund);
export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as orderController from './order.controller.js';

const router = Router();

// All admin order endpoints require authentication and admin role
router.use(authenticate, authorize('admin'));

router.get('/', orderController.getAdminOrders);
router.get('/:id', orderController.getAdminOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);
router.patch('/:id/payment', orderController.updatePaymentStatus);
router.post('/:id/reconcile-stock', orderController.reconcileOrderStock);

export default router;

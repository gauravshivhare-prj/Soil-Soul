import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as orderController from './order.controller.js';

const router = Router();

// All order endpoints require authentication
router.use(authenticate);

// Specific endpoints before parameterized :id
router.get('/payment-methods', orderController.getPaymentMethods);
router.post('/', orderController.createOrder);
router.get('/', orderController.getOrderHistory);
router.get('/:id', orderController.getOrderById);

export default router;

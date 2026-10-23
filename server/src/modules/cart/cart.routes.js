import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as cartController from './cart.controller.js';

const router = Router();

// All cart endpoints require verified authentication
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.patch('/items/:key', cartController.updateItemQuantity);
router.delete('/items/:key', cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;

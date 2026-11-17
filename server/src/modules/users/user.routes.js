import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as userController from './user.controller.js';

const router = Router();

// Only the caller's own account: the user id always comes from the verified token.
router.patch('/me', authenticate, userController.updateMe);

// Saved addresses (up to 3 addresses per user profile)
router.get('/me/addresses', authenticate, userController.getAddresses);
router.post('/me/addresses', authenticate, userController.addAddress);
router.patch('/me/addresses/:addressId', authenticate, userController.updateAddress);
router.delete('/me/addresses/:addressId', authenticate, userController.deleteAddress);
router.post('/me/addresses/:addressId/default', authenticate, userController.setDefaultAddress);

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as userController from './user.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', userController.getAdminCustomers);

export default router;

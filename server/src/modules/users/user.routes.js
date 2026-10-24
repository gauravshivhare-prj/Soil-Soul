import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as userController from './user.controller.js';

const router = Router();

// Only the caller's own account: the user id always comes from the verified token.
router.patch('/me', authenticate, userController.updateMe);

export default router;

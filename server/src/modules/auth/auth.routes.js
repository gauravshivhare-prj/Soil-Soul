import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate, authLimiter } from './auth.middleware.js';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.me);

export default router;

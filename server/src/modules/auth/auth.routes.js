import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate, authLimiter } from './auth.middleware.js';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
// Renews the access token from the httpOnly refresh cookie (the 256-bit secret can't be guessed,
// so the global API limiter is enough; the stricter auth limiter would trip on normal reloads).
router.post('/refresh', authController.refresh);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/resend-verification', authLimiter, authController.resendVerification);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/change-password', authLimiter, authenticate, authController.changePassword);

export default router;

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { handleAssistantChat } from './assistant.controller.js';

const router = Router();

// Dedicated rate limiter to protect external Gemini API quota & server resources
const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 45, // 45 queries per 15 minutes per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'You have sent quite a few messages recently. Please take a moment before asking another question.',
    },
  },
});

router.post('/chat', assistantLimiter, handleAssistantChat);
router.post('/', assistantLimiter, handleAssistantChat);

export default router;

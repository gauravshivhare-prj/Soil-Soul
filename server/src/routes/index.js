import { Router } from 'express';

const router = Router();

/**
 * Health check endpoint
 * Route: GET /api/v1/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'soil-and-soul-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import { getDashboardSummary } from './dashboard.service.js';

const router = Router();

// Every route: authenticated admin only (applied once at router level).
router.use(authenticate, authorize('admin'));

router.get('/summary', async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: { summary: await getDashboardSummary(req.query) } });
  } catch (err) {
    next(err);
  }
});

export default router;

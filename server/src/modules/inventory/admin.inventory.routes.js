import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as service from './inventory.service.js';

const router = Router();

// Every route: authenticated admin only (applied once at router level).
router.use(authenticate, authorize('admin'));

const handle = (status, fn) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (err) {
    next(err);
  }
};

router.get('/', handle(200, async (req) => service.listInventory(req.query)));
router.get('/movements', handle(200, async (req) => service.listMovements(req.query)));
router.post('/adjustments', handle(201, async (req) => service.adjustStock(req.body, req.user.id)));

export default router;

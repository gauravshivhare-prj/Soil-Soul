import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as service from './category.admin.service.js';

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

router.get('/', handle(200, async (req) => service.listCategoriesAdmin(req.query)));
router.get('/:id', handle(200, async (req) => ({ category: await service.getCategoryAdmin(req.params.id) })));
router.post('/', handle(201, async (req) => ({ category: await service.createCategory(req.body) })));
router.patch('/:id', handle(200, async (req) => ({ category: await service.updateCategory(req.params.id, req.body) })));
router.post('/:id/archive', handle(200, async (req) => ({ category: await service.archiveCategory(req.params.id) })));
router.post('/:id/restore', handle(200, async (req) => ({ category: await service.restoreCategory(req.params.id) })));

export default router;

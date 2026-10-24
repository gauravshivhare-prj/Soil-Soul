import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import * as service from './product.admin.service.js';

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

router.get('/', handle(200, async (req) => service.listProductsAdmin(req.query)));
router.get('/:id', handle(200, async (req) => ({ product: await service.getProductAdmin(req.params.id) })));
router.post('/', handle(201, async (req) => ({ product: await service.createProduct(req.body, req.user.id) })));
router.patch('/:id', handle(200, async (req) => ({ product: await service.updateProduct(req.params.id, req.body) })));
router.post('/:id/archive', handle(200, async (req) => ({ product: await service.archiveProduct(req.params.id) })));
router.post('/:id/restore', handle(200, async (req) => ({ product: await service.restoreProduct(req.params.id) })));

export default router;

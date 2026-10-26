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
// What a deletion would involve (read-only), then the delete itself (explicit confirmation required).
router.get('/:id/deletion', handle(200, async (req) => service.getProductDeletion(req.params.id)));
router.post('/', handle(201, async (req) => ({ product: await service.createProduct(req.body, req.user.id) })));
router.patch('/:id', handle(200, async (req) => ({ product: await service.updateProduct(req.params.id, req.body, req.user.id) })));
router.post('/:id/archive', handle(200, async (req) => ({ product: await service.archiveProduct(req.params.id) })));
router.post('/:id/restore', handle(200, async (req) => ({ product: await service.restoreProduct(req.params.id) })));
router.delete('/:id', handle(200, async (req) => service.deleteProduct(req.params.id, req.body)));

export default router;

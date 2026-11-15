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

// Product CSV Template & Import routes (must precede /:id)
router.get('/template', (req, res) => {
  const template = service.getProductCsvTemplate();
  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json({ success: true, data: { template } });
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products_template.csv"');
  return res.status(200).send(template);
});

router.post('/import/validate', handle(200, async (req) => service.validateProductImport(req.body)));
router.post('/import', handle(201, async (req) => service.importProducts(req.body, req.user?.id)));

router.get('/:id', handle(200, async (req) => ({ product: await service.getProductAdmin(req.params.id) })));
// What a deletion would involve (read-only), then the delete itself (explicit confirmation required).
router.get('/:id/deletion', handle(200, async (req) => service.getProductDeletion(req.params.id)));
router.post('/', handle(201, async (req) => ({ product: await service.createProduct(req.body, req.user.id) })));
router.patch('/:id', handle(200, async (req) => ({ product: await service.updateProduct(req.params.id, req.body, req.user.id) })));
router.post('/:id/archive', handle(200, async (req) => ({ product: await service.archiveProduct(req.params.id) })));
router.post('/:id/restore', handle(200, async (req) => ({ product: await service.restoreProduct(req.params.id) })));
router.delete('/:id', handle(200, async (req) => service.deleteProduct(req.params.id, req.body)));

export default router;

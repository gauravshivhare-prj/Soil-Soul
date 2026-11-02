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
router.post('/initialize', handle(200, async () => service.initializeCanonicalCategories()));

// Category CSV Template & Import routes (must precede /:id)
router.get('/template', (req, res) => {
  const template = service.getCategoryCsvTemplate();
  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json({ success: true, data: { template } });
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="categories_template.csv"');
  return res.status(200).send(template);
});

router.post('/import/validate', handle(200, async (req) => service.validateCategoryImport(req.body)));
router.post('/import', handle(201, async (req) => service.importCategories(req.body)));

router.get('/:id', handle(200, async (req) => ({ category: await service.getCategoryAdmin(req.params.id) })));
// What a deletion would involve (read-only), then the delete itself (empty categories only; confirmation required).
router.get('/:id/deletion', handle(200, async (req) => service.getCategoryDeletion(req.params.id)));
router.post('/', handle(201, async (req) => ({ category: await service.createCategory(req.body) })));
router.patch('/:id', handle(200, async (req) => ({ category: await service.updateCategory(req.params.id, req.body) })));
router.post('/:id/archive', handle(200, async (req) => ({ category: await service.archiveCategory(req.params.id) })));
router.post('/:id/restore', handle(200, async (req) => ({ category: await service.restoreCategory(req.params.id) })));
router.delete('/:id', handle(200, async (req) => service.deleteCategory(req.params.id, req.body)));

export default router;

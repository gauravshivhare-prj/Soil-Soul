import { Router } from 'express';
import { databaseStatus } from '../config/db.js';
import authRouter from '../modules/auth/auth.routes.js';
import categoryRouter from '../modules/categories/category.routes.js';
import productRouter from '../modules/products/product.routes.js';

const router = Router();

// Liveness: 200 while the process runs.
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'soil-and-soul-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: databaseStatus(),
  });
});

// Readiness: 200 only when the database is connected.
router.get('/health/ready', (req, res) => {
  const database = databaseStatus();
  const ready = database === 'connected';
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database });
});

// Authentication routes (/api/v1/auth)
router.use('/auth', authRouter);

// Catalog routes (/api/v1/categories, /api/v1/products)
router.use('/categories', categoryRouter);
router.use('/products', productRouter);

export default router;

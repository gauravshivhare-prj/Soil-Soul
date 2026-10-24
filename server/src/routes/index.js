import { Router } from 'express';
import { databaseStatus } from '../config/db.js';
import { isShuttingDown } from '../config/lifecycle.js';
import authRouter from '../modules/auth/auth.routes.js';
import userRouter from '../modules/users/user.routes.js';
import adminUserRouter from '../modules/users/admin.user.routes.js';
import categoryRouter from '../modules/categories/category.routes.js';
import productRouter from '../modules/products/product.routes.js';
import cartRouter from '../modules/cart/cart.routes.js';
import orderRouter from '../modules/orders/order.routes.js';
import adminOrderRouter from '../modules/orders/admin.order.routes.js';
import adminCategoryRouter from '../modules/categories/admin.category.routes.js';
import adminProductRouter from '../modules/products/admin.product.routes.js';
import adminInventoryRouter from '../modules/inventory/admin.inventory.routes.js';
import adminDashboardRouter from '../modules/admin/admin.dashboard.routes.js';

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

// Readiness: 200 only when the database is connected and the process is not shutting down.
router.get('/health/ready', (req, res) => {
  const database = databaseStatus();
  const ready = database === 'connected' && !isShuttingDown();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database });
});

// Authentication routes (/api/v1/auth)
router.use('/auth', authRouter);

// Own-account routes (/api/v1/users/me)
router.use('/users', userRouter);
router.use('/admin/customers', adminUserRouter);

// Catalog routes (/api/v1/categories, /api/v1/products)
router.use('/categories', categoryRouter);
router.use('/products', productRouter);

// Cart routes (/api/v1/cart)
router.use('/cart', cartRouter);

// Order routes (/api/v1/orders)
router.use('/orders', orderRouter);

// Admin order routes (/api/v1/admin/orders)
router.use('/admin/orders', adminOrderRouter);

// Admin catalog and inventory (/api/v1/admin/categories, /admin/products, /admin/inventory)
router.use('/admin/categories', adminCategoryRouter);
router.use('/admin/products', adminProductRouter);
router.use('/admin/inventory', adminInventoryRouter);
router.use('/admin/dashboard', adminDashboardRouter);

export default router;

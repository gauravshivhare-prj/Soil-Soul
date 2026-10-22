import { Router } from 'express';
import { databaseStatus } from '../config/db.js';

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

export default router;

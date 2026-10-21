import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import apiRouter from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.cors.origin,
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount versioned API router under /api/v1
app.use('/api/v1', apiRouter);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: env.isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    },
  });
});

export { app };
export default app;

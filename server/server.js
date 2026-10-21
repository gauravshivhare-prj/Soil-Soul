import env from './src/config/env.js';
import app from './src/app.js';

/**
 * Start HTTP server listener
 */
const server = app.listen(env.port, () => {
  console.log(`[server] Soil & Soul backend running on port ${env.port} (${env.env})`);
  console.log(`[server] Health check: http://localhost:${env.port}/api/v1/health`);
});

/**
 * Graceful shutdown handler
 */
function handleShutdown(signal) {
  console.log(`[server] Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error('[server] Error while closing HTTP server:', err);
      process.exit(1);
    }
    console.log('[server] HTTP server successfully closed.');
    process.exit(0);
  });

  // Force close if connections don't drain within 10 seconds
  const forceTimeout = setTimeout(() => {
    console.error('[server] Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);

  forceTimeout.unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught Exception:', error);
  process.exit(1);
});

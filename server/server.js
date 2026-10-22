import env from './src/config/env.js';
import app from './src/app.js';
import { connectDatabase, disconnectDatabase } from './src/config/db.js';
import { logError } from './src/utils/logError.js';

let server;
let shutdownCode = null; // set once shutdown starts

// Stop accepting connections, let in-flight requests finish, close MongoDB, exit.
function shutdown(reason, exitCode = 0) {
  if (shutdownCode !== null) return;
  shutdownCode = exitCode;
  console.log(`[server] ${reason}. Shutting down...`);
  setTimeout(() => {
    console.error('[server] Shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000).unref();

  const finish = (code) =>
    disconnectDatabase().then(
      () => process.exit(code),
      () => process.exit(1)
    );

  if (!server?.listening) return finish(exitCode);
  server.close((err) => finish(err ? 1 : exitCode));
}

process.on('SIGINT', () => shutdown('Received SIGINT'));
process.on('SIGTERM', () => shutdown('Received SIGTERM'));
// Process state is unknown after these, so exit non-zero.
process.on('unhandledRejection', (err) => {
  logError('[server] Unhandled rejection:', err);
  shutdown('Unhandled rejection', 1);
});
process.on('uncaughtException', (err) => {
  logError('[server] Uncaught exception:', err);
  shutdown('Uncaught exception', 1);
});

try {
  await connectDatabase();
} catch (err) {
  // Shutdown began while connecting (it closed the connection): keep its exit code, skip the misleading message.
  if (shutdownCode !== null) process.exit(shutdownCode);
  // Error name only: messages can include host details.
  console.error(`[server] Could not connect to MongoDB (${err.name}). Check MONGODB_URI. Server not started.`);
  process.exit(1);
}

server = app.listen(env.port, () => console.log(`[server] Listening on port ${env.port} (${env.env})`));
// Bound slow or stalled requests; headersTimeout must not exceed requestTimeout.
server.requestTimeout = 30_000;
server.headersTimeout = 20_000;
server.on('error', (err) => {
  logError('[server] HTTP server error:', err);
  shutdown('HTTP server error', 1);
});

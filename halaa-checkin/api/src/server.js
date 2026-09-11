/**
 * @halaa-checkin/api
 * Standalone server entry point.
 * Initializes DB connection, ensures indexes, and manages graceful shutdown.
 */

import { createApp } from './app.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, validateConfig } from './config.js';
import { connectDb, disconnectDb, checkReplicaSet } from './db/connection.js';
import { ensureIndexes } from './db/indexes.js';
import { exportWorker, checkWorkerHealth } from './modules/exports/exports.worker.js';
import { ExportsService } from './modules/exports/exports.service.js';

async function startServer() {
  try {
    // 1. Validate configuration fail-fast
    validateConfig(config);

    // 2. Connect to database
    console.log(`Connecting to MongoDB (${config.mongodb.dbName})...`);
    await connectDb(config);
    console.log('MongoDB connected successfully.');

    // 3. Ensure collection indexes (F28: explicit in production).
    if (config.isProd) {
      const { verifyIndexes } = await import('./db/indexes.js');
      await verifyIndexes();
      console.log('Database indexes verified (production; no auto-create).');
    } else {
      await ensureIndexes();
      console.log('Database indexes initialized.');
    }

    // 4. Verify replica-set readiness (transactions are mandatory)
    const hasReplicaSet = await checkReplicaSet();
    if (!hasReplicaSet) {
      if (config.isProd) {
        throw new Error('MongoDB replica set required in production: transactions unavailable.');
      }
      console.warn('WARNING: MongoDB is not running as a replica set. Transactions will fail in production.');
    }

    // 5. Run startup cleanup, schedule periodic TTL sweep, start worker
    const { ensureExportQueueFence } = await import('./modules/exports/exportQuota.js');
    await ensureExportQueueFence();
    await ExportsService.cleanupExpiredArtifacts();
    // Periodic sweep every 15 min (disk cleanup is separate from Mongo TTL)
    const cleanupTimer = setInterval(() => {
      ExportsService.cleanupExpiredArtifacts().catch((err) => {
        console.error('Periodic export cleanup failed:', err?.message || err);
      });
    }, 15 * 60 * 1000);
    cleanupTimer.unref?.();
    exportWorker.start();
    console.log('PDF export worker started.');

    // 6. Create app and start listening (F23: real worker health injected).
    const app = createApp({ workerHealth: () => checkWorkerHealth({ exportDir: config.export.dir }) });
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`Halaa Check-in API listening on port ${config.port}`);
      console.log(`API URL: http://127.0.0.1:${config.port}${config.apiPrefix}`);
    });

    // 7. Graceful shutdown
    let isShuttingDown = false;
    async function handleShutdown(signal) {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`Received ${signal}. Gracefully stopping server...`);

      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await exportWorker.stop();
          console.log('Export worker stopped.');
          await disconnectDb();
          console.log('MongoDB disconnected.');
          process.exit(0);
        } catch (err) {
          console.error('Error during database disconnect:', err);
          process.exit(1);
        }
      });

      // Force exit after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        console.error('Shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
      }, 10000).unref();
    }

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

// Only run server when invoked directly (path comparison works on both
// Windows drive-letter paths and POSIX absolute paths in containers).
const invokedAsMain =
  typeof process.argv[1] === 'string' &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedAsMain) {
  startServer();
}

export { startServer };

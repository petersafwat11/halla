/**
 * @halaa-checkin/api
 * Database connection module for MongoDB.
 * Enforces mini-app database prefix, transaction readiness, and clean shutdown.
 */

import mongoose from 'mongoose';
import { validateConfig } from '../config.js';

/**
 * Connect to dedicated mini-app MongoDB database.
 *
 * @param {object} config
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDb(config) {
  // Validate configuration before connecting
  validateConfig(config);

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const { uri, dbName } = config.mongodb;

  const isProd = config.env === 'production' || process.env.NODE_ENV === 'production';
  const options = {
    dbName,
    // F28: production index creation moves to the explicit deployment command
    // (`npm run db:indexes`); the app must not silently modify indexes on boot.
    autoIndex: !isProd,
    serverSelectionTimeoutMS: 5000,
  };

  if (config.mongodb.tlsCertPath) {
    options.tls = true;
    options.tlsCertificateKeyFile = config.mongodb.tlsCertPath;
  }

  await mongoose.connect(uri, options);
  return mongoose;
}

/**
 * Check if the connected MongoDB instance supports replica-set transactions.
 * Uses `hello` (works with DB-scoped users) with `serverStatus` fallback.
 *
 * @returns {Promise<boolean>}
 */
export async function checkReplicaSet() {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  try {
    const adminDb = mongoose.connection.db.admin();
    // Preferred: hello works without clusterMonitor privileges.
    try {
      const hello = await adminDb.command({ hello: 1 });
      if (hello && (hello.setName || hello.isWritablePrimary !== undefined)) {
        // setName present => replica set; single-node replset also reports setName.
        if (hello.setName) return true;
      }
    } catch {
      // Fall through to serverStatus probe below.
    }
    const serverStatus = await adminDb.serverStatus();
    return !!serverStatus.repl;
  } catch {
    return false;
  }
}

/**
 * Gracefully disconnect from MongoDB.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

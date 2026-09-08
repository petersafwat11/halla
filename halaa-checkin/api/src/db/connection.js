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

  const options = {
    dbName,
    autoIndex: true,
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
 *
 * @returns {Promise<boolean>}
 */
export async function checkReplicaSet() {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  try {
    const adminDb = mongoose.connection.db.admin();
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

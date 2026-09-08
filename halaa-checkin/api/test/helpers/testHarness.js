/**
 * @halaa-checkin/api
 * Test Harness for replica-set integration testing.
 * Uses MongoMemoryReplSet to allow real MongoDB transactions and index deduplication
 * in completely isolated, disposable in-memory databases.
 */

import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { ensureIndexes } from '../../src/db/indexes.js';

let replSetInstance = null;

/**
 * Start the MongoMemoryReplSet instance if not already running.
 *
 * @returns {Promise<MongoMemoryReplSet>}
 */
export async function getReplSet() {
  if (!replSetInstance) {
    replSetInstance = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
  }
  return replSetInstance;
}

/**
 * Setup a disposable test database on the replica set.
 *
 * @returns {Promise<{ dbName: string, uri: string, config: object }>}
 */
export async function setupTestDb() {
  const replSet = await getReplSet();
  const uri = replSet.getUri();
  const dbName = `halaa_checkin_test_${crypto.randomBytes(6).toString('hex')}`;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri, {
    dbName,
    autoIndex: true,
  });

  await ensureIndexes();

  const testConfig = loadConfig({
    env: 'test',
    mongodbUri: uri,
    mongodbDbName: dbName,
    appOrigin: 'http://localhost:3100',
    sessionSecret: 'test-session-secret-at-least-32-chars-long!',
  });

  return { dbName, uri, config: testConfig };
}

/**
 * Clean up collections in the current test database.
 */
export async function clearDatabase() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  }
}

/**
 * Teardown the current disposable database and disconnect.
 */
export async function teardownTestDb() {
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db.dropDatabase();
    } catch {
      // Ignore drop errors
    }
    await mongoose.disconnect();
  }
}

/**
 * Stop the underlying replica set on suite completion.
 */
export async function stopReplSet() {
  await teardownTestDb();
  if (replSetInstance) {
    await replSetInstance.stop();
    replSetInstance = null;
  }
}

/**
 * Create a configured Express test application instance.
 *
 * @param {object} [options]
 * @returns {import('express').Application}
 */
export function createTestApp(options = {}) {
  const { registerRoutes, loginLimiter, ...configOverrides } = options;
  const cfg = loadConfig({
    env: 'test',
    appOrigin: 'http://localhost:3100',
    sessionSecret: 'test-session-secret-at-least-32-chars-long!',
    ...configOverrides,
  });
  return createApp({ config: cfg, registerRoutes, loginLimiter });
}

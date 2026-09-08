/**
 * @halaa-checkin/api
 * Index initialization and verification CLI script.
 * Usage: npm run db:indexes (or node api/scripts/ensure-indexes.mjs)
 */

import { config, validateConfig } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { ensureIndexes, verifyIndexes } from '../src/db/indexes.js';

async function main() {
  try {
    validateConfig(config);
    console.log(`Connecting to database ${config.mongodb.dbName}...`);
    await connectDb(config);

    console.log('Ensuring all collection indexes...');
    await ensureIndexes();

    console.log('Verifying index integrity...');
    await verifyIndexes();

    console.log('All required database indexes are verified successfully.');
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure/verify database indexes:', err.message);
    try {
      await disconnectDb();
    } catch {
      // Ignore disconnect error on failure
    }
    process.exit(1);
  }
}

main();

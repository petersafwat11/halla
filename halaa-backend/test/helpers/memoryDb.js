/**
 * Ephemeral MongoDB replica set for integration tests (BILL-10 · §10).
 *
 * Uses mongodb-memory-server's MongoMemoryReplSet so real Mongo transactions
 * (session.withTransaction) and unique-index dedupe behave exactly as in prod
 * Atlas — WITHOUT touching the shared staging/production cluster and WITHOUT any
 * real credentials or provider access. Every integration test boots an isolated
 * instance; nothing is shared with the live DB.
 */

const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let replset = null;

async function start() {
  if (mongoose.connection.readyState === 1) return;
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri(), { dbName: "billing_test" });
  // Ensure unique/partial indexes exist before tests rely on dedupe.
  const models = ["RevenueCatEvent", "EventEntitlement", "Addon", "Subscription", "Payment"];
  for (const name of models) {
    if (mongoose.models[name]) {
      // eslint-disable-next-line no-await-in-loop
      await mongoose.models[name].init().catch(() => {});
    }
  }
}

async function stop() {
  await mongoose.disconnect().catch(() => {});
  if (replset) await replset.stop().catch(() => {});
  replset = null;
}

async function clearAll() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

module.exports = { start, stop, clearAll };

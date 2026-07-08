/**
 * withTransaction — run a unit of work inside a Mongo transaction, falling back
 * to sequential (NON-atomic) writes on a standalone mongod that doesn't support
 * them. Mirrors the try/catch pattern already used in `payments.service.js` /
 * `events.crud.service.js`, extracted for the new billing code (no existing
 * call sites are refactored).
 *
 * The callback receives the session (or `null` in fallback mode) and MUST pass
 * it through to every model op it wants inside the transaction:
 *   await withTransaction(async (session) => {
 *     await Doc.create([obj], session ? { session } : undefined);
 *     await Other.updateOne(q, u, session ? { session } : {});
 *   }, { label: "rc.process" });
 *
 * On a replica set (prod Atlas, and the test MongoMemoryReplSet) the write is
 * atomic and rolls back on throw. On standalone Mongo it degrades with a warning.
 */

const mongoose = require("mongoose");
const logger = require("./logger");

const STANDALONE_HINTS = [
  "Transaction numbers are only allowed on a replica set",
  "Transactions are not supported",
  "This MongoDB deployment does not support retryable writes",
  "not supported",
  "IllegalOperation",
];

function isStandaloneTxnError(err) {
  const msg = `${err?.message || ""} ${err?.codeName || ""}`;
  return STANDALONE_HINTS.some((h) => msg.includes(h));
}

async function withTransaction(fn, { label = "txn" } = {}) {
  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (isStandaloneTxnError(err)) {
      logger.warn(`[${label}] transactions unavailable — running sequential (NOT atomic)`);
      return fn(null);
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

module.exports = { withTransaction, isStandaloneTxnError };

/**
 * @halaa-checkin/api
 * Transaction helper for MongoDB multi-document transactions.
 * Enforces snapshot read concern, majority write concern, and automatic abort on error.
 * Adheres to Technical Contract Section 5.
 */

import mongoose from 'mongoose';

/**
 * Execute a callback within a MongoDB multi-document replica-set transaction.
 *
 * @template T
 * @param {(session: import('mongoose').ClientSession) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTransaction(callback) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(
      async () => {
        result = await callback(session);
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      }
    );
    return result;
  } finally {
    await session.endSession();
  }
}

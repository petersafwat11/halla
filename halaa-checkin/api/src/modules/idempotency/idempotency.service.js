/**
 * @halaa-checkin/api
 * Idempotency Service.
 * Manages atomic idempotency records, payload hashing, and response caching.
 * Adheres to Technical Contract Sections 3–5.
 */

import crypto from 'node:crypto';
import { Idempotency } from './idempotency.model.js';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const IdempotencyService = {
  /**
   * Compute a canonical SHA-256 hash of a payload.
   * Strips UTF-8 BOM, trims whitespace, and canonicalizes objects if applicable.
   *
   * @param {string | object} payload
   * @returns {string} Hex SHA-256 digest
   */
  computeHash(payload) {
    let serialized;
    if (typeof payload === 'string') {
      serialized = payload.replace(/^\uFEFF/, '').trim();
    } else if (payload !== null && typeof payload === 'object') {
      // Canonical key-sorted JSON
      const sortedKeys = Object.keys(payload).sort();
      const obj = {};
      for (const k of sortedKeys) {
        obj[k] = payload[k];
      }
      serialized = JSON.stringify(obj);
    } else {
      serialized = String(payload);
    }
    return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
  },

  /**
   * Find an existing idempotency record.
   *
   * @param {object} params
   * @param {string | import('mongoose').Types.ObjectId} params.actorId
   * @param {string} params.operation
   * @param {string | import('mongoose').Types.ObjectId} params.eventId
   * @param {string} params.key
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<import('./idempotency.model.js').Idempotency | null>}
   */
  async findExisting({ actorId, operation, eventId, key }, { session } = {}) {
    const rec = await Idempotency.findOne({
      actorId,
      operation,
      eventId,
      key,
    }).session(session || null);
    // F28: handle expired key records deterministically rather than depending
    // on TTL timing. Expired records are treated as absent so a new operation
    // with the same key starts fresh; callers never replay stale responses.
    if (rec && rec.expiresAt && rec.expiresAt <= new Date()) {
      // Remove the expired unique-key occupant within the caller transaction.
      // Otherwise TTL lag makes the replacement insert collide indefinitely.
      await Idempotency.deleteOne({ _id: rec._id, expiresAt: { $lte: new Date() } }).session(session || null);
      return null;
    }
    return rec;
  },

  /**
   * Record a completed idempotency entry.
   *
   * @param {object} params
   * @param {string | import('mongoose').Types.ObjectId} params.actorId
   * @param {string} params.operation
   * @param {string | import('mongoose').Types.ObjectId} params.eventId
   * @param {string} params.key
   * @param {string} params.requestHash
   * @param {number} params.status
   * @param {object} params.body
   * @param {Date} [params.expiresAt]
   * @param {object} [options]
   * @param {import('mongoose').ClientSession} [options.session]
   * @returns {Promise<import('./idempotency.model.js').Idempotency>}
   */
  async record(
    {
      actorId,
      operation,
      eventId,
      key,
      requestHash,
      status,
      body,
      expiresAt,
    },
    { session } = {}
  ) {
    const record = new Idempotency({
      actorId,
      operation,
      eventId,
      key,
      requestHash,
      response: {
        status,
        body,
      },
      expiresAt: expiresAt || new Date(Date.now() + DEFAULT_TTL_MS),
    });

    await record.save({ session });
    return record;
  },
};

/**
 * @halaa-checkin/api
 * Index initialization and verification module.
 * Adheres to Technical Contract Sections 3 & 8.
 */

import { User } from '../modules/auth/user.model.js';
import { Session } from '../modules/auth/session.model.js';
import { Event } from '../modules/events/event.model.js';
import { Guest } from '../modules/guests/guest.model.js';
import { Audit } from '../modules/audit/audit.model.js';
import { Idempotency } from '../modules/idempotency/idempotency.model.js';
import { ExportJob } from '../modules/exports/exportJob.model.js';

/**
 * Ensure indexes exist on all declared collections.
 *
 * @returns {Promise<void>}
 */
export async function ensureIndexes() {
  await Promise.all([
    User.init(),
    Session.init(),
    Event.init(),
    Guest.init(),
    Audit.init(),
    Idempotency.init(),
    ExportJob.init(),
  ]);
}

/**
 * Verify that all required indexes exist on MongoDB collections.
 *
 * @returns {Promise<void>}
 * @throws {Error} If any required index is missing
 */
export async function verifyIndexes() {
  const targets = [
    {
      model: User,
      required: ['username_1'],
    },
    {
      model: Session,
      required: ['tokenHash_1', 'expiresAt_1'],
    },
    {
      model: Event,
      required: ['status_1', 'startsAt_-1_createdAt_-1'],
    },
    {
      model: Guest,
      required: [
        'qrToken_1',
        'eventId_1_shortCode_1',
        'eventId_1_referenceKey_1',
        'eventId_1_deletedAt_1_nameSearch_1__id_1',
        'eventId_1_deletedAt_1_checkIn.checkedInAt_-1',
      ],
    },
    {
      model: Audit,
      required: [
        'eventId_1_timestamp_-1',
        'guestId_1_timestamp_-1',
        'actorId_1_timestamp_-1',
      ],
    },
    {
      model: Idempotency,
      required: [
        'actorId_1_operation_1_eventId_1_key_1',
        'expiresAt_1',
      ],
    },
    {
      model: ExportJob,
      required: [
        'eventId_1_createdAt_-1',
        'createdBy_1_state_1',
        'state_1_createdAt_1',
        'expiresAt_1',
      ],
    },
  ];

  for (const { model, required } of targets) {
    const existing = await model.collection.indexes();
    const existingNames = new Set(existing.map((idx) => idx.name));
    for (const reqIdx of required) {
      if (!existingNames.has(reqIdx)) {
        throw new Error(
          `Required index '${reqIdx}' is missing on collection '${model.collection.name}'`
        );
      }
    }
  }
}

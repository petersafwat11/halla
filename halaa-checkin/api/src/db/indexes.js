import { isDeepStrictEqual } from 'node:util';
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
import { ExportQuota } from '../modules/exports/exportQuota.js';

const models = [User, Session, Event, Guest, Audit, Idempotency, ExportJob, ExportQuota];

// Explicit deployment command works even when production autoIndex is false.
// Never drop an index here; incompatible existing options fail for review.
export async function ensureIndexes() {
  await Promise.all(models.map(async model => {
    await model.createCollection();
    await model.createIndexes();
  }));
}

export async function verifyIndexes() {
  for (const model of models) {
    const actual = await model.collection.indexes();
    for (const [key, options] of model.schema.indexes()) {
      const name = options.name || Object.entries(key).map(([field, direction]) => `${field}_${direction}`).join('_');
      const found = actual.find(index => index.name === name);
      if (!found || JSON.stringify(found.key) !== JSON.stringify(key)) {
        throw new Error(`Required index '${name}' is missing or has wrong keys on '${model.collection.name}'`);
      }
      for (const option of ['unique', 'sparse', 'expireAfterSeconds', 'partialFilterExpression']) {
        const expected = options[option] ?? (['unique', 'sparse'].includes(option) ? false : undefined);
        const value = found[option] ?? (['unique', 'sparse'].includes(option) ? false : undefined);
        if (!isDeepStrictEqual(value, expected)) throw new Error(`Index '${name}' has wrong ${option} on '${model.collection.name}'`);
      }
    }
  }
}

/**
 * @halaa-checkin/api
 * Integration test suite for Events, Guests, Audit, and Statistics.
 * Validates Technical Contract Sections 3–6 and Task T03 Acceptance Gate:
 * - CRUD persistence for events and guests
 * - Duplicate guest names allowed with distinct IDs/shortCodes
 * - References unique within an event (and reusable across events or after soft-delete)
 * - Cross-event IDs strictly rejected (404)
 * - qrToken strictly omitted from ordinary reads and DTOs
 * - qrToken and shortCode remain immutable across edits
 * - Stale edits return 409 VERSION_CONFLICT
 * - Soft-deleted guests excluded from lookups, lists, and statistics
 * - 1,000-invitation capacity limit strictly enforced
 * - Closed-event rejection prevents adding, editing, or deleting guests
 * - Statistics remain event-wide and unchanged by list filters
 * - Transaction rollback when audit or write fails
 * - All required indexes verified on a real MongoDB replica set
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  ROLES,
  EVENT_STATUSES,
  ERROR_CODES,
  LIMITS,
  REGEXES,
} from '@halaa-checkin/contracts';
import {
  setupTestDb,
  clearDatabase,
  stopReplSet,
  createTestApp,
} from './helpers/testHarness.js';
import {
  createTestEvent,
  createTestGuest,
} from './helpers/syntheticFixtures.js';
import { provisionUser } from '../src/modules/auth/auth.service.js';
import { Event } from '../src/modules/events/event.model.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { Audit } from '../src/modules/audit/audit.model.js';
import { verifyIndexes } from '../src/db/indexes.js';
import { AuditService } from '../src/modules/audit/audit.service.js';

let testEnv;

test.before(async () => {
  testEnv = await setupTestDb();
});

test.after(async () => {
  await stopReplSet();
});

test.beforeEach(async () => {
  await clearDatabase();
});

async function loginUser(app, { username, password }) {
  const res = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username, password });

  const rawCookie = res.headers['set-cookie'];
  const cookie = Array.isArray(rawCookie) ? rawCookie[0] : rawCookie;
  return {
    cookie,
    csrfToken: res.body.data.csrfToken,
    user: res.body.data.user,
  };
}

// ============================================================================
// 1. Health and Index Verification
// ============================================================================

test('readiness: /health/ready passes and all indexes verified on replica set', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const res = await request(app).get('/api/checkin/v1/health/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ready');

  // Verify directly against verifyIndexes()
  await assert.doesNotReject(async () => {
    await verifyIndexes();
  });

  // Check specific collection indexes on Guest
  const guestIndexes = await Guest.collection.indexes();
  const indexNames = guestIndexes.map((i) => i.name);
  assert.ok(indexNames.includes('qrToken_1'), 'Must have unique qrToken index');
  assert.ok(indexNames.includes('eventId_1_shortCode_1'), 'Must have unique shortCode per event index');
  assert.ok(indexNames.includes('eventId_1_referenceKey_1'), 'Must have partial unique reference index');
  assert.ok(indexNames.includes('eventId_1_deletedAt_1_nameSearch_1__id_1'), 'Must have listing index');
  assert.ok(indexNames.includes('eventId_1_deletedAt_1_checkIn.checkedInAt_-1'), 'Must have recent checkIn index');
});

// ============================================================================
// 2. Event CRUD, Lifecycle & Scoping
// ============================================================================

test('events: admin CRUD persistence, versioning, and status transitions', async () => {
  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // 1. Create event
  const createRes = await request(app)
    .post('/api/checkin/v1/events')
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'مؤتمر التقنية والضيافة 2026',
      venue: 'فندق هيلتون الرياض',
      startsAt: '2026-09-20T18:00:00+03:00',
    });

  assert.equal(createRes.status, 201);
  const createdEvent = createRes.body.data;
  assert.ok(createdEvent.id);
  assert.equal(createdEvent.name, 'مؤتمر التقنية والضيافة 2026');
  assert.equal(createdEvent.status, EVENT_STATUSES.DRAFT);
  assert.equal(createdEvent.version, 1);
  assert.equal(createdEvent.activitySeq, 0);

  // Check audit for event creation
  const createAudit = await Audit.findOne({ eventId: createdEvent.id, action: 'EVENT_CREATE' });
  assert.ok(createAudit);
  assert.equal(createAudit.actorName, 'Admin User');

  // 2. List events
  const listRes = await request(app)
    .get('/api/checkin/v1/events')
    .set('Cookie', auth.cookie);

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.length, 1);
  assert.equal(listRes.body.meta.total, 1);

  // 3. Update event settings (name and venue)
  const updateRes = await request(app)
    .patch(`/api/checkin/v1/events/${createdEvent.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 1,
      name: 'مؤتمر التقنية والضيافة المحدث 2026',
      venue: 'قاعة الأوركيد - هيلتون الرياض',
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.data.name, 'مؤتمر التقنية والضيافة المحدث 2026');
  assert.equal(updateRes.body.data.version, 2);
  // Settings edit does NOT increment activitySeq
  assert.equal(updateRes.body.data.activitySeq, 0);

  // 4. Stale event edit returns 409
  const staleRes = await request(app)
    .patch(`/api/checkin/v1/events/${createdEvent.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 1, // Stale!
      name: 'Another Name',
    });

  assert.equal(staleRes.status, 409);
  assert.equal(staleRes.body.error.code, ERROR_CODES.VERSION_CONFLICT);

  // 5. Transition status: draft -> live
  const liveRes = await request(app)
    .post(`/api/checkin/v1/events/${createdEvent.id}/status`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 2,
      status: EVENT_STATUSES.LIVE,
    });

  assert.equal(liveRes.status, 200);
  assert.equal(liveRes.body.data.status, EVENT_STATUSES.LIVE);
  assert.equal(liveRes.body.data.version, 3);
  assert.equal(liveRes.body.data.activitySeq, 1); // Lifecycle transition increments activitySeq

  // 6. Transition status: live -> closed
  const closeRes = await request(app)
    .post(`/api/checkin/v1/events/${createdEvent.id}/status`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 3,
      status: EVENT_STATUSES.CLOSED,
    });

  assert.equal(closeRes.status, 200);
  assert.equal(closeRes.body.data.status, EVENT_STATUSES.CLOSED);
  assert.ok(closeRes.body.data.closedAt);
  assert.equal(closeRes.body.data.version, 4);

  // 7. Closed event cannot be edited
  const editClosedRes = await request(app)
    .patch(`/api/checkin/v1/events/${createdEvent.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 4,
      name: 'Attempt edit on closed event',
    });

  assert.equal(editClosedRes.status, 409);
  assert.equal(editClosedRes.body.error.code, ERROR_CODES.EVENT_CLOSED);

  // 8. Reopen closed event requires reason
  const reopenNoReason = await request(app)
    .post(`/api/checkin/v1/events/${createdEvent.id}/status`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 4,
      status: EVENT_STATUSES.LIVE,
    });
  assert.equal(reopenNoReason.status, 409);

  const reopenSuccess = await request(app)
    .post(`/api/checkin/v1/events/${createdEvent.id}/status`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 4,
      status: EVENT_STATUSES.LIVE,
      reason: 'Reopened by authorized event manager for late attendees',
    });

  assert.equal(reopenSuccess.status, 200);
  assert.equal(reopenSuccess.body.data.status, EVENT_STATUSES.LIVE);
  assert.equal(reopenSuccess.body.data.closedAt, null);
});

test('events: reception scope restrictions and event isolation', async () => {
  const event1 = await createTestEvent({ name: 'Event 1' });
  const event2 = await createTestEvent({ name: 'Event 2' });

  await provisionUser({
    username: 'receptionist',
    displayName: 'Staff 1',
    password: 'Password123!',
    role: ROLES.RECEPTION,
    assignedEventIds: [event1._id.toString()],
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'receptionist', password: 'Password123!' });

  // Receptionist lists events -> only sees assigned event1
  const listRes = await request(app)
    .get('/api/checkin/v1/events')
    .set('Cookie', auth.cookie);

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.length, 1);
  assert.equal(listRes.body.data[0].id, event1._id.toString());

  // Accessing assigned event1 succeeds
  const get1Res = await request(app)
    .get(`/api/checkin/v1/events/${event1._id}`)
    .set('Cookie', auth.cookie);
  assert.equal(get1Res.status, 200);

  // Accessing unassigned event2 returns generic 404
  const get2Res = await request(app)
    .get(`/api/checkin/v1/events/${event2._id}`)
    .set('Cookie', auth.cookie);
  assert.equal(get2Res.status, 404);
  assert.equal(get2Res.body.error.code, ERROR_CODES.NOT_FOUND);

  // Reception cannot create event (403)
  const createRes = await request(app)
    .post('/api/checkin/v1/events')
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'Unauthorized Event',
      venue: 'Venue',
      startsAt: '2026-09-20T18:00:00+03:00',
    });
  assert.equal(createRes.status, 403);
});

// ============================================================================
// 3. Guest CRUD, Tokens, and Uniqueness Rules
// ============================================================================

test('guests: CRUD, tokens omitted from DTOs, and immutable tokens', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // 1. Create guest
  const createRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'أحمد بن محمد السعدون',
      reference: 'INV-1001',
      allowedCompanions: 2,
      companionNames: ['سعد السعدون', 'فيصل السعدون'],
    });

  assert.equal(createRes.status, 201);
  const createdGuest = createRes.body.data;
  assert.ok(createdGuest.id);
  assert.equal(createdGuest.name, 'أحمد بن محمد السعدون');
  assert.equal(createdGuest.reference, 'INV-1001');
  assert.equal(createdGuest.allowedCompanions, 2);
  assert.equal(createdGuest.totalAllowed, 3);
  assert.equal(createdGuest.version, 1);
  assert.equal(createdGuest.checkIn, null);

  // TOKEN OMITTED FROM DTO
  assert.equal(createdGuest.qrToken, undefined, 'qrToken must NOT be present in DTO');
  assert.ok(REGEXES.CROCKFORD_BASE32_SHORT_CODE.test(createdGuest.shortCode));

  // Verify in database that qrToken exists and has valid format
  const rawDbGuest = await Guest.findById(createdGuest.id).select('+qrToken');
  assert.ok(rawDbGuest.qrToken);
  assert.ok(rawDbGuest.qrToken.startsWith('HGC1.'));
  assert.ok(REGEXES.QR_TOKEN.test(rawDbGuest.qrToken));
  const originalQrToken = rawDbGuest.qrToken;
  const originalShortCode = rawDbGuest.shortCode;

  // 2. Get guest by ID (DTO must omit token)
  const getRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/guests/${createdGuest.id}`)
    .set('Cookie', auth.cookie);

  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.data.qrToken, undefined);
  assert.equal(getRes.body.data.shortCode, originalShortCode);

  // 3. Update guest (IMMUTABLE TOKEN VERIFICATION)
  const updateRes = await request(app)
    .patch(`/api/checkin/v1/events/${event._id}/guests/${createdGuest.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 1,
      name: 'أحمد بن محمد السعدون - معدل',
      allowedCompanions: 3,
      companionNames: ['سعد السعدون', 'فيصل السعدون', 'خالد السعدون'],
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.data.name, 'أحمد بن محمد السعدون - معدل');
  assert.equal(updateRes.body.data.version, 2);
  assert.equal(updateRes.body.data.totalAllowed, 4);
  assert.equal(updateRes.body.data.qrToken, undefined);

  // DB tokens MUST remain unchanged
  const postEditDbGuest = await Guest.findById(createdGuest.id).select('+qrToken');
  assert.equal(postEditDbGuest.qrToken, originalQrToken, 'qrToken must remain strictly immutable');
  assert.equal(postEditDbGuest.shortCode, originalShortCode, 'shortCode must remain strictly immutable');

  // Stale update returns 409
  const staleGuestRes = await request(app)
    .patch(`/api/checkin/v1/events/${event._id}/guests/${createdGuest.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 1, // Stale!
      name: 'Stale attempt',
    });
  assert.equal(staleGuestRes.status, 409);
  assert.equal(staleGuestRes.body.error.code, ERROR_CODES.VERSION_CONFLICT);

  // 4. Soft-delete guest
  const deleteRes = await request(app)
    .delete(`/api/checkin/v1/events/${event._id}/guests/${createdGuest.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ version: 2 });

  assert.equal(deleteRes.status, 204);

  // Soft-deleted guest excluded from lookup
  const getDeletedRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/guests/${createdGuest.id}`)
    .set('Cookie', auth.cookie);
  assert.equal(getDeletedRes.status, 404);

  // Soft-deleted guest excluded from listing
  const listAfterDelete = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/guests`)
    .set('Cookie', auth.cookie);
  assert.equal(listAfterDelete.body.data.length, 0);
  assert.equal(listAfterDelete.body.meta.total, 0);

  // Stale delete returns 409
  const deleteAgainRes = await request(app)
    .delete(`/api/checkin/v1/events/${event._id}/guests/${createdGuest.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ version: 2 });
  assert.equal(deleteAgainRes.status, 404); // Already deleted
});

test('guests: duplicate names are allowed with distinct identifiers', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // Create two guests with the exact same name
  const res1 = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'محمد عبدالله الشمري',
      allowedCompanions: 1,
      reference: 'INV-A',
    });

  const res2 = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'محمد عبدالله الشمري', // Duplicate name
      allowedCompanions: 0,
      reference: 'INV-B',
    });

  assert.equal(res1.status, 201);
  assert.equal(res2.status, 201);
  assert.notEqual(res1.body.data.id, res2.body.data.id);
  assert.notEqual(res1.body.data.shortCode, res2.body.data.shortCode);
  assert.equal(res1.body.data.name, res2.body.data.name);
});

test('guests: references are unique within event, reusable cross-event and after soft-delete', async () => {
  const event1 = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const event2 = await createTestEvent({ status: EVENT_STATUSES.DRAFT });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // 1. Create first guest with reference "VIP-001" in event1
  const res1 = await request(app)
    .post(`/api/checkin/v1/events/${event1._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'Guest 1',
      reference: 'VIP-001',
      allowedCompanions: 1,
    });
  assert.equal(res1.status, 201);

  // 2. Duplicate reference in SAME event returns 409 REFERENCE_CONFLICT
  const dupRes = await request(app)
    .post(`/api/checkin/v1/events/${event1._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'Guest 2',
      reference: 'vip-001', // Case-insensitive collision
      allowedCompanions: 0,
    });
  assert.equal(dupRes.status, 409);
  assert.equal(dupRes.body.error.code, ERROR_CODES.REFERENCE_CONFLICT);

  // 3. Same reference in DIFFERENT event (event2) succeeds
  const crossEventRes = await request(app)
    .post(`/api/checkin/v1/events/${event2._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'Guest In Event 2',
      reference: 'VIP-001',
      allowedCompanions: 0,
    });
  assert.equal(crossEventRes.status, 201);

  // 4. Soft-delete guest in event1, then reuse same reference in event1 -> succeeds!
  await request(app)
    .delete(`/api/checkin/v1/events/${event1._id}/guests/${res1.body.data.id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ version: 1 });

  const reuseRes = await request(app)
    .post(`/api/checkin/v1/events/${event1._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'Replaced Guest 1',
      reference: 'VIP-001',
      allowedCompanions: 2,
    });
  assert.equal(reuseRes.status, 201);
});

test('guests: cross-event IDs are strictly rejected (404)', async () => {
  const event1 = await createTestEvent({ name: 'Event 1' });
  const event2 = await createTestEvent({ name: 'Event 2' });
  const guest1 = await createTestGuest(event1._id, { name: 'Guest In Event 1' });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // Request guest1 under event2 path
  const getRes = await request(app)
    .get(`/api/checkin/v1/events/${event2._id}/guests/${guest1._id}`)
    .set('Cookie', auth.cookie);
  assert.equal(getRes.status, 404);
  assert.equal(getRes.body.error.code, ERROR_CODES.NOT_FOUND);

  // Patch guest1 under event2 path
  const patchRes = await request(app)
    .patch(`/api/checkin/v1/events/${event2._id}/guests/${guest1._id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ version: 1, name: 'Cross-event exploit' });
  assert.equal(patchRes.status, 404);

  // Delete guest1 under event2 path
  const deleteRes = await request(app)
    .delete(`/api/checkin/v1/events/${event2._id}/guests/${guest1._id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ version: 1 });
  assert.equal(deleteRes.status, 404);
});

test('guests: capacity limit (1,000 active invitations) strictly enforced', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // Stub countActive to simulate reaching capacity limit of 1,000
  const originalCount = Guest.countDocuments;
  Guest.countDocuments = function (filter) {
    if (filter.eventId.toString() === event._id.toString()) {
      return {
        session() {
          return Promise.resolve(LIMITS.MAX_EVENT_INVITATIONS);
        },
      };
    }
    return originalCount.apply(this, arguments);
  };

  try {
    const res = await request(app)
      .post(`/api/checkin/v1/events/${event._id}/guests`)
      .set('Cookie', auth.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', auth.csrfToken)
      .send({
        name: 'Guest Beyond Limit',
        allowedCompanions: 0,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, ERROR_CODES.CAPACITY_EXCEEDED);
  } finally {
    Guest.countDocuments = originalCount;
  }
});

test('guests: closed events reject guest mutations', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.CLOSED, closedAt: new Date() });
  const guest = await createTestGuest(event._id, { name: 'Existing Guest' });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // Add guest to closed event -> 409
  const addRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/guests`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      name: 'New Guest in Closed Event',
      allowedCompanions: 0,
    });
  assert.equal(addRes.status, 409);
  assert.equal(addRes.body.error.code, ERROR_CODES.EVENT_CLOSED);

  // Edit guest in closed event -> 409
  const editRes = await request(app)
    .patch(`/api/checkin/v1/events/${event._id}/guests/${guest._id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 1,
      name: 'Edit Guest in Closed Event',
    });
  assert.equal(editRes.status, 409);
  assert.equal(editRes.body.error.code, ERROR_CODES.EVENT_CLOSED);

  // Delete guest in closed event -> 409
  const delRes = await request(app)
    .delete(`/api/checkin/v1/events/${event._id}/guests/${guest._id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ version: 1 });
  assert.equal(delRes.status, 409);
  assert.equal(delRes.body.error.code, ERROR_CODES.EVENT_CLOSED);
});

test('guests: admitted guests cannot be edited or deleted with ordinary CRUD', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, {
    name: 'Admitted Guest',
    allowedCompanions: 2,
    checkIn: {
      actualCompanions: 1,
      checkedInAt: new Date(),
      checkedInBy: new mongoose.Types.ObjectId(),
      operatorName: 'Receptionist 1',
      method: 'scanner',
    },
  });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // Attempt ordinary edit on admitted guest -> 409 ALREADY_CHECKED_IN
  const editRes = await request(app)
    .patch(`/api/checkin/v1/events/${event._id}/guests/${guest._id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({
      version: 1,
      name: 'Admitted Guest Edited',
    });
  assert.equal(editRes.status, 409);
  assert.equal(editRes.body.error.code, ERROR_CODES.ALREADY_CHECKED_IN);

  // Attempt ordinary delete on admitted guest -> 409 ALREADY_CHECKED_IN
  const delRes = await request(app)
    .delete(`/api/checkin/v1/events/${event._id}/guests/${guest._id}`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ version: 1 });
  assert.equal(delRes.status, 409);
  assert.equal(delRes.body.error.code, ERROR_CODES.ALREADY_CHECKED_IN);
});

// ============================================================================
// 4. Statistics Endpoint and Filter Isolation
// ============================================================================

test('stats: exact 3-invitation fixture and unchanged by table search/filters', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });

  // Fixture from Technical Contract Section 6:
  // Guest A: allowed 2, checkedIn with 1
  const _guestA = await createTestGuest(event._id, {
    name: 'Guest A',
    allowedCompanions: 2,
    checkIn: {
      actualCompanions: 1,
      checkedInAt: new Date(),
      checkedInBy: new mongoose.Types.ObjectId(),
      operatorName: 'Operator 1',
      method: 'camera',
    },
  });

  // Guest B: allowed 0, pending (checkIn = null)
  const guestB = await createTestGuest(event._id, {
    name: 'Guest B',
    allowedCompanions: 0,
    checkIn: null,
  });

  // Guest C: allowed 3, checkedIn with 3
  const _guestC = await createTestGuest(event._id, {
    name: 'Guest C',
    allowedCompanions: 3,
    checkIn: {
      actualCompanions: 3,
      checkedInAt: new Date(),
      checkedInBy: new mongoose.Types.ObjectId(),
      operatorName: 'Operator 2',
      method: 'manual',
    },
  });

  // Soft-deleted guest D (should be excluded from stats)
  await createTestGuest(event._id, {
    name: 'Guest D (Deleted)',
    allowedCompanions: 5,
    deletedAt: new Date(),
  });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // 1. Query stats directly
  const statsRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/stats`)
    .set('Cookie', auth.cookie);

  assert.equal(statsRes.status, 200);
  const stats = statsRes.body.data;
  assert.equal(stats.totalInvitations, 3);
  assert.equal(stats.totalAllowedCompanions, 5);
  assert.equal(stats.expectedPeople, 8);
  assert.equal(stats.admittedInvitations, 2);
  assert.equal(stats.actualCompanions, 4);
  assert.equal(stats.actualAttendees, 6);
  assert.equal(stats.pendingInvitations, 1);
  assert.equal(stats.invitationAttendanceRate, 66.7);
  assert.equal(stats.capacityAttendanceRate, 75.0);
  assert.ok(stats.asOf);

  // 2. Query table with filters (e.g. status=pending)
  const pendingGuestsRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/guests?status=pending`)
    .set('Cookie', auth.cookie);

  assert.equal(pendingGuestsRes.status, 200);
  assert.equal(pendingGuestsRes.body.data.length, 1);
  assert.equal(pendingGuestsRes.body.data[0].id, guestB._id.toString());

  // Verify that filtering table does NOT change stats endpoint totals
  const recheckStatsRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/stats`)
    .set('Cookie', auth.cookie);

  assert.equal(recheckStatsRes.body.data.totalInvitations, 3);
  assert.equal(recheckStatsRes.body.data.admittedInvitations, 2);
  assert.equal(recheckStatsRes.body.data.pendingInvitations, 1);
});

// ============================================================================
// 5. Transaction Rollback when Audit / Write Fails
// ============================================================================

test('transactions: rollback when audit write fails leaves no partial records', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });

  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginUser(app, { username: 'admin', password: 'Password123!' });

  // Stub AuditService.record to simulate a database failure during audit insert
  const originalRecord = AuditService.record;
  AuditService.record = async function () {
    throw new Error('Simulated audit disk failure');
  };

  try {
    const res = await request(app)
      .post(`/api/checkin/v1/events/${event._id}/guests`)
      .set('Cookie', auth.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', auth.csrfToken)
      .send({
        name: 'Guest Rollback Test',
        reference: 'ROLLBACK-001',
        allowedCompanions: 1,
      });

    assert.equal(res.status, 500);

    // CRITICAL: verify the guest was NOT created in the database
    const savedGuest = await Guest.findOne({ reference: 'ROLLBACK-001' });
    assert.equal(savedGuest, null, 'Guest document must be rolled back on audit failure');

    // And verify event activitySeq was NOT permanently incremented
    const eventDoc = await Event.findById(event._id);
    assert.equal(eventDoc.activitySeq, 0, 'Event activitySeq must be rolled back');
  } finally {
    AuditService.record = originalRecord;
  }
});

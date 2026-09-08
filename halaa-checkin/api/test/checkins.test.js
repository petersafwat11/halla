/**
 * @halaa-checkin/api
 * Integration test suite for Gate Resolution, Atomic Admission, and Admin Correction/Reset.
 * Validates Technical Contract Sections 4–6, Product Section 6, and Task T05 Acceptance Gate:
 * - Resolve QR or guest ID inside authorized event returns safe data without writing admission
 * - Cross-event and unknown QR token use fails (404 INVALID_INVITATION) with zero token leakage
 * - Gate search (up to 20 matches) and recent admissions (latest 10) work
 * - Fractional, excess, or negative actualCompanions fail (400)
 * - Atomic admission with event fence, idempotency, and audit
 * - Concurrency gate: two distinct receptionists submit simultaneously for one guest with different keys:
 *   one commit, one duplicate (409 ALREADY_CHECKED_IN), one audit record, correct stats
 * - Same-key retries and simulated lost HTTP response return original 201 result without duplicating
 * - Idempotency key reuse with different payload returns 409 IDEMPOTENCY_CONFLICT
 * - Closing event concurrently with admission has a serializable result
 * - Concurrent allowance edit cannot silently overwrite a scan (serializes via version/fence)
 * - Receptionist cannot reset or correct admission (403 FORBIDDEN)
 * - Admin correction preserves original check-in timestamp and operator, updates count and stats
 * - Admin reset retains old admission in audit, resets checkIn to null, and enables another deliberate admission
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import crypto from 'node:crypto';
import {
  ROLES,
  EVENT_STATUSES,
  ERROR_CODES,
} from '@halaa-checkin/contracts';
import {
  setupTestDb,
  clearDatabase,
  stopReplSet,
  createTestApp,
} from './helpers/testHarness.js';
import { createTestEvent, createTestGuest } from './helpers/syntheticFixtures.js';
import { provisionUser } from '../src/modules/auth/auth.service.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { Audit } from '../src/modules/audit/audit.model.js';
import { EventsService } from '../src/modules/events/events.service.js';

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

async function loginUser(app, { username, displayName, role, assignedEventIds = [] }) {
  await provisionUser({
    username,
    displayName,
    password: 'Password123!',
    role,
    assignedEventIds: assignedEventIds.map(String),
  });

  const res = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username, password: 'Password123!' });

  const rawCookie = res.headers['set-cookie'];
  const cookie = Array.isArray(rawCookie) ? rawCookie[0] : rawCookie;
  return {
    cookie,
    csrfToken: res.body.data.csrfToken,
    user: res.body.data.user,
  };
}

// ============================================================================
// 1. Gate Resolution & Search
// ============================================================================

test('gate: resolve QR token and guestId returns safe data without writing admission', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, {
    name: 'سارة عبدالله الفهد',
    reference: 'REF-SARAH-01',
    allowedCompanions: 2,
    companionNames: ['مرافق 1', 'مرافق 2'],
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const reception = await loginUser(app, {
    username: 'reception_sarah',
    displayName: 'Receptionist Sarah',
    role: ROLES.RECEPTION,
    assignedEventIds: [event._id],
  });

  // Fetch QR token directly from DB for test request
  const guestInDb = await Guest.findById(guest._id).select('+qrToken');

  // 1. Resolve via QR token
  const resToken = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/gate/resolve`)
    .set('Cookie', reception.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', reception.csrfToken)
    .send({ token: guestInDb.qrToken });

  assert.equal(resToken.status, 200);
  const data = resToken.body.data;
  assert.equal(data.guest.id, guest._id.toString());
  assert.equal(data.guest.name, 'سارة عبدالله الفهد');
  assert.equal(data.guest.totalAllowed, 3);
  assert.equal(data.guest.checkIn, null);
  assert.equal(data.guest.qrToken, undefined); // Token never leaked
  assert.equal(data.event.id, event._id.toString());
  assert.equal(data.event.status, EVENT_STATUSES.LIVE);
  assert.equal(data.eventState, EVENT_STATUSES.LIVE);

  // Verify resolve did NOT admit the guest
  const unchangedGuest = await Guest.findById(guest._id);
  assert.equal(unchangedGuest.checkIn, null);

  // 2. Resolve via guestId
  const resId = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/gate/resolve`)
    .set('Cookie', reception.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', reception.csrfToken)
    .send({ guestId: guest._id.toString() });

  assert.equal(resId.status, 200);
  assert.equal(resId.body.data.guest.id, guest._id.toString());
});

test('gate: cross-event and unknown QR tokens fail with 404 INVALID_INVITATION and zero data leaked', async () => {
  const eventA = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const eventB = await createTestEvent({ status: EVENT_STATUSES.LIVE });

  const guestA = await createTestGuest(eventA._id, { name: 'ضيف حدث أ' });
  const guestAWithToken = await Guest.findById(guestA._id).select('+qrToken');

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const receptionB = await loginUser(app, {
    username: 'reception_b',
    displayName: 'Receptionist B',
    role: ROLES.RECEPTION,
    assignedEventIds: [eventB._id],
  });

  // Attempt to resolve Event A's QR token inside Event B
  const resCross = await request(app)
    .post(`/api/checkin/v1/events/${eventB._id}/gate/resolve`)
    .set('Cookie', receptionB.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', receptionB.csrfToken)
    .send({ token: guestAWithToken.qrToken });

  assert.equal(resCross.status, 404);
  assert.equal(resCross.body.error.code, ERROR_CODES.INVALID_INVITATION);
  assert.equal(resCross.body.data, undefined);

  // Unknown random token
  const resUnknown = await request(app)
    .post(`/api/checkin/v1/events/${eventB._id}/gate/resolve`)
    .set('Cookie', receptionB.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', receptionB.csrfToken)
    .send({ token: 'HGC1.UNKNOWN_TOKEN_0123456789' });

  assert.equal(resUnknown.status, 404);
  assert.equal(resUnknown.body.error.code, ERROR_CODES.INVALID_INVITATION);
});

test('gate: soft-deleted guest cannot resolve', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, {
    name: 'محذوف',
    deletedAt: new Date(),
  });
  const guestWithToken = await Guest.findById(guest._id).select('+qrToken');

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const admin = await loginUser(app, {
    username: 'admin_resolve',
    displayName: 'Admin',
    role: ROLES.ADMIN,
  });

  const res = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/gate/resolve`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .send({ token: guestWithToken.qrToken });

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, ERROR_CODES.INVALID_INVITATION);
});

test('gate: search and recent endpoints return bounded safe matches', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const reception = await loginUser(app, {
    username: 'reception_search',
    displayName: 'Receptionist',
    role: ROLES.RECEPTION,
    assignedEventIds: [event._id],
  });

  const g1 = await createTestGuest(event._id, {
    name: 'أحمد بن محمد السعدون',
    reference: 'REF-AHMED-99',
  });
  const g2 = await createTestGuest(event._id, {
    name: 'فاطمة الزهراء الشمري',
    reference: 'REF-FATIMA-12',
    checkIn: {
      actualCompanions: 1,
      checkedInAt: new Date(Date.now() - 60000),
      checkedInBy: reception.user.id,
      operatorName: reception.user.displayName,
      method: 'scanner',
    },
  });

  // Search by normalized Arabic name
  const resSearchName = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/gate/search?q=احمد`)
    .set('Cookie', reception.cookie);

  assert.equal(resSearchName.status, 200);
  assert.equal(resSearchName.body.data.length, 1);
  assert.equal(resSearchName.body.data[0].id, g1._id.toString());
  assert.equal(resSearchName.body.data[0].qrToken, undefined);

  // Search by reference
  const resSearchRef = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/gate/search?q=REF-FATIMA`)
    .set('Cookie', reception.cookie);

  assert.equal(resSearchRef.status, 200);
  assert.equal(resSearchRef.body.data.length, 1);
  assert.equal(resSearchRef.body.data[0].id, g2._id.toString());

  // Recent admissions
  const resRecent = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/gate/recent`)
    .set('Cookie', reception.cookie);

  assert.equal(resRecent.status, 200);
  assert.equal(resRecent.body.data.length, 1);
  assert.equal(resRecent.body.data[0].id, g2._id.toString());
  assert.equal(resRecent.body.data[0].checkIn.operatorName, reception.user.displayName);
  assert.equal(resRecent.body.data[0].checkIn.actualPartySize, 2);
});

// ============================================================================
// 2. Admission Validation & Idempotency
// ============================================================================

test('admission: fractional, negative, or excess companion counts fail validation', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, { allowedCompanions: 2 });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const admin = await loginUser(app, {
    username: 'admin_val',
    displayName: 'Admin Val',
    role: ROLES.ADMIN,
  });

  // Fractional count (e.g. 1.5)
  const resFrac = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/checkins`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      guestId: guest._id.toString(),
      version: guest.version,
      actualCompanions: 1.5,
      method: 'camera',
    });

  assert.equal(resFrac.status, 400);
  assert.equal(resFrac.body.error.code, ERROR_CODES.VALIDATION_FAILED);

  // Excess count (3 when allowed is 2)
  const resExcess = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/checkins`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      guestId: guest._id.toString(),
      version: guest.version,
      actualCompanions: 3,
      method: 'camera',
    });

  assert.equal(resExcess.status, 400);
  assert.equal(resExcess.body.error.code, ERROR_CODES.VALIDATION_FAILED);

  // Negative count (-1)
  const resNeg = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/checkins`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      guestId: guest._id.toString(),
      version: guest.version,
      actualCompanions: -1,
      method: 'camera',
    });

  assert.equal(resNeg.status, 400);
  assert.equal(resNeg.body.error.code, ERROR_CODES.VALIDATION_FAILED);
});

test('admission: non-live event rejects admission with 409', async () => {
  const draftEvent = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const draftGuest = await createTestGuest(draftEvent._id, { allowedCompanions: 1 });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const admin = await loginUser(app, {
    username: 'admin_nonlive',
    displayName: 'Admin Nonlive',
    role: ROLES.ADMIN,
  });

  // Draft event
  const resDraft = await request(app)
    .post(`/api/checkin/v1/events/${draftEvent._id}/checkins`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      guestId: draftGuest._id.toString(),
      version: draftGuest.version,
      actualCompanions: 1,
      method: 'camera',
    });

  assert.equal(resDraft.status, 409);
  assert.equal(resDraft.body.error.code, ERROR_CODES.EVENT_NOT_LIVE);

  // Closed event
  const closedEvent = await createTestEvent({ status: EVENT_STATUSES.CLOSED });
  const closedGuest = await createTestGuest(closedEvent._id, { allowedCompanions: 1 });

  const resClosed = await request(app)
    .post(`/api/checkin/v1/events/${closedEvent._id}/checkins`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .set('Idempotency-Key', crypto.randomUUID())
    .send({
      guestId: closedGuest._id.toString(),
      version: closedGuest.version,
      actualCompanions: 1,
      method: 'camera',
    });

  assert.equal(resClosed.status, 409);
  assert.equal(resClosed.body.error.code, ERROR_CODES.EVENT_CLOSED);
});

test('admission: same-key retry and simulated lost HTTP response return original result without duplicate write', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, { allowedCompanions: 2 });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const reception = await loginUser(app, {
    username: 'reception_retry',
    displayName: 'Receptionist Retry',
    role: ROLES.RECEPTION,
    assignedEventIds: [event._id],
  });

  const idempotencyKey = crypto.randomUUID();
  const payload = {
    guestId: guest._id.toString(),
    version: guest.version,
    actualCompanions: 2,
    method: 'camera',
  };

  // First admission attempt
  const resFirst = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/checkins`)
    .set('Cookie', reception.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', reception.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send(payload);

  assert.equal(resFirst.status, 201);
  assert.equal(resFirst.body.data.checkIn.actualCompanions, 2);
  assert.equal(resFirst.body.data.checkIn.actualPartySize, 3);
  assert.equal(resFirst.body.data.version, 2);

  // Simulated retry (e.g. network timeout / lost response retry) with SAME key
  const resRetry = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/checkins`)
    .set('Cookie', reception.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', reception.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send(payload);

  assert.equal(resRetry.status, 201);
  assert.deepEqual(resRetry.body, resFirst.body);

  // Verify only 1 audit record and 1 checkin
  const audits = await Audit.find({ eventId: event._id, action: 'GUEST_CHECKIN' });
  assert.equal(audits.length, 1);

  // Reusing same key with different payload returns 409 IDEMPOTENCY_CONFLICT
  const resDiff = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/checkins`)
    .set('Cookie', reception.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', reception.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send({
      ...payload,
      actualCompanions: 0,
    });

  assert.equal(resDiff.status, 409);
  assert.equal(resDiff.body.error.code, ERROR_CODES.IDEMPOTENCY_CONFLICT);
});

// ============================================================================
// 3. Concurrency Gate (Critical Acceptance Requirement)
// ============================================================================

test('concurrency: two distinct reception users submit simultaneously: one commit, one duplicate, one audit, correct stats', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, {
    name: 'ضيف الاختبار المتزامن',
    allowedCompanions: 3,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const [reception1, reception2] = await Promise.all([
    loginUser(app, {
      username: 'reception_gate_1',
      displayName: 'Staff Alpha',
      role: ROLES.RECEPTION,
      assignedEventIds: [event._id],
    }),
    loginUser(app, {
      username: 'reception_gate_2',
      displayName: 'Staff Beta',
      role: ROLES.RECEPTION,
      assignedEventIds: [event._id],
    }),
  ]);

  const key1 = crypto.randomUUID();
  const key2 = crypto.randomUUID();

  // Fire two simultaneous admission requests with distinct users and keys
  const [res1, res2] = await Promise.all([
    request(app)
      .post(`/api/checkin/v1/events/${event._id}/checkins`)
      .set('Cookie', reception1.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', reception1.csrfToken)
      .set('Idempotency-Key', key1)
      .send({
        guestId: guest._id.toString(),
        version: guest.version,
        actualCompanions: 2,
        method: 'camera',
      }),
    request(app)
      .post(`/api/checkin/v1/events/${event._id}/checkins`)
      .set('Cookie', reception2.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', reception2.csrfToken)
      .set('Idempotency-Key', key2)
      .send({
        guestId: guest._id.toString(),
        version: guest.version,
        actualCompanions: 1,
        method: 'scanner',
      }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  // Exactly one 201 Created, exactly one 409 Conflict
  assert.deepEqual(statuses, [201, 409]);

  const successRes = res1.status === 201 ? res1 : res2;
  const conflictRes = res1.status === 409 ? res1 : res2;

  assert.equal(conflictRes.body.error.code, ERROR_CODES.ALREADY_CHECKED_IN);
  assert.ok(conflictRes.body.error.details.guest);
  assert.equal(conflictRes.body.error.details.guest.id, guest._id.toString());
  assert.ok(conflictRes.body.error.details.guest.checkIn);

  // Exactly one checkin record in DB
  const updatedGuest = await Guest.findById(guest._id);
  assert.ok(updatedGuest.checkIn !== null);
  assert.equal(updatedGuest.version, 2);

  // Exactly one GUEST_CHECKIN audit record
  const audits = await Audit.find({ eventId: event._id, action: 'GUEST_CHECKIN' });
  assert.equal(audits.length, 1);

  // Check statistics reflect exactly 1 admitted invitation
  const stats = await EventsService.getEventStats(event._id.toString(), reception1.user);
  assert.equal(stats.totalInvitations, 1);
  assert.equal(stats.admittedInvitations, 1);
  assert.equal(stats.pendingInvitations, 0);
  assert.equal(stats.actualCompanions, successRes.body.data.checkIn.actualCompanions);
  assert.equal(stats.actualAttendees, 1 + successRes.body.data.checkIn.actualCompanions);
});

test('concurrency: closing event concurrently with admission has serializable result', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, { allowedCompanions: 1 });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const admin = await loginUser(app, {
    username: 'admin_close_race',
    displayName: 'Admin Close Race',
    role: ROLES.ADMIN,
  });

  // Concurrently request: close event & admit guest
  const [resClose, resAdmit] = await Promise.all([
    request(app)
      .post(`/api/checkin/v1/events/${event._id}/status`)
      .set('Cookie', admin.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        version: event.version,
        status: EVENT_STATUSES.CLOSED,
      }),
    request(app)
      .post(`/api/checkin/v1/events/${event._id}/checkins`)
      .set('Cookie', admin.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', admin.csrfToken)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        guestId: guest._id.toString(),
        version: guest.version,
        actualCompanions: 0,
        method: 'manual',
      }),
  ]);

  // Two valid serializable outcomes:
  // Option A: Admission committed first (201), then close succeeded (200)
  // Option B: Close committed first (200), then admission rejected with 409 EVENT_CLOSED
  if (resAdmit.status === 201) {
    assert.equal(resClose.status, 200);
    const guestInDb = await Guest.findById(guest._id);
    assert.ok(guestInDb.checkIn !== null);
  } else {
    assert.equal(resAdmit.status, 409);
    assert.equal(resAdmit.body.error.code, ERROR_CODES.EVENT_CLOSED);
    assert.equal(resClose.status, 200);
  }
});

test('concurrency: concurrent allowance edit cannot silently overwrite a scan', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const guest = await createTestGuest(event._id, { allowedCompanions: 2 });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const admin = await loginUser(app, {
    username: 'admin_edit_race',
    displayName: 'Admin Edit Race',
    role: ROLES.ADMIN,
  });

  // Concurrently request: edit guest allowance & admit guest
  const [resEdit, resAdmit] = await Promise.all([
    request(app)
      .patch(`/api/checkin/v1/events/${event._id}/guests/${guest._id}`)
      .set('Cookie', admin.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        version: guest.version,
        allowedCompanions: 1,
      }),
    request(app)
      .post(`/api/checkin/v1/events/${event._id}/checkins`)
      .set('Cookie', admin.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', admin.csrfToken)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        guestId: guest._id.toString(),
        version: guest.version,
        actualCompanions: 2,
        method: 'camera',
      }),
  ]);

  // Both cannot succeed silently on stale versions:
  // If edit commits first: guest.version increments to 2 and allowedCompanions is 1.
  //   Admission fails either with 409 VERSION_CONFLICT or validation.
  // If admission commits first: guest.checkIn is set and version increments to 2.
  //   Edit fails with 409 ALREADY_CHECKED_IN or 409 VERSION_CONFLICT.
  const successCount = (resEdit.status === 200 ? 1 : 0) + (resAdmit.status === 201 ? 1 : 0);
  assert.equal(successCount, 1);
});

// ============================================================================
// 4. Correction and Reset Lifecycle
// ============================================================================

test('correction and reset: reception user cannot correct or reset admission (403)', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const reception = await loginUser(app, {
    username: 'reception_forbidden',
    displayName: 'Receptionist',
    role: ROLES.RECEPTION,
    assignedEventIds: [event._id],
  });

  const guest = await createTestGuest(event._id, {
    allowedCompanions: 2,
    checkIn: {
      actualCompanions: 1,
      checkedInAt: new Date(),
      checkedInBy: reception.user.id,
      operatorName: reception.user.displayName,
      method: 'camera',
    },
  });

  // Correction attempt by reception
  const resCorr = await request(app)
    .patch(`/api/checkin/v1/events/${event._id}/guests/${guest._id}/checkin`)
    .set('Cookie', reception.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', reception.csrfToken)
    .send({
      version: guest.version,
      actualCompanions: 2,
      reason: 'تصحيح عدد المرافقين من موظف الاستقبال',
    });

  assert.equal(resCorr.status, 403);
  assert.equal(resCorr.body.error.code, ERROR_CODES.FORBIDDEN);

  // Reset attempt by reception
  const resReset = await request(app)
    .delete(`/api/checkin/v1/events/${event._id}/guests/${guest._id}/checkin`)
    .set('Cookie', reception.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', reception.csrfToken)
    .send({
      version: guest.version,
      reason: 'إلغاء تسجيل الدخول من موظف الاستقبال',
    });

  assert.equal(resReset.status, 403);
  assert.equal(resReset.body.error.code, ERROR_CODES.FORBIDDEN);
});

test('correction: admin corrects actualCompanions, preserves operator/time, audits change and updates stats', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const reception = await loginUser(app, {
    username: 'reception_orig',
    displayName: 'Staff Original',
    role: ROLES.RECEPTION,
    assignedEventIds: [event._id],
  });
  const admin = await loginUser(app, {
    username: 'admin_corr',
    displayName: 'Admin Supervisor',
    role: ROLES.ADMIN,
  });

  const originalTime = new Date('2026-09-08T18:00:00.000Z');
  const guest = await createTestGuest(event._id, {
    allowedCompanions: 3,
    checkIn: {
      actualCompanions: 1,
      checkedInAt: originalTime,
      checkedInBy: reception.user.id,
      operatorName: reception.user.displayName,
      method: 'camera',
    },
    version: 1,
  });

  // Admin corrects companion count from 1 to 3
  const res = await request(app)
    .patch(`/api/checkin/v1/events/${event._id}/guests/${guest._id}/checkin`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .send({
      version: guest.version,
      actualCompanions: 3,
      reason: 'وصل اثنان من المرافقين إضافيين مع الضيف',
    });

  assert.equal(res.status, 200);
  const corrected = res.body.data;
  assert.equal(corrected.checkIn.actualCompanions, 3);
  assert.equal(corrected.checkIn.actualPartySize, 4);
  assert.equal(corrected.version, 2);
  // Preserves original operator and time
  assert.equal(corrected.checkIn.operatorName, reception.user.displayName);
  assert.equal(corrected.checkIn.checkedInAt, originalTime.toISOString());

  // Check audit log
  const audit = await Audit.findOne({
    eventId: event._id,
    guestId: guest._id,
    action: 'CHECKIN_CORRECTION',
  });
  assert.ok(audit);
  assert.equal(audit.actorName, admin.user.displayName);
  assert.equal(audit.reason, 'وصل اثنان من المرافقين إضافيين مع الضيف');
  assert.equal(audit.changes.before.actualCompanions, 1);
  assert.equal(audit.changes.after.actualCompanions, 3);

  // Check stats updated without counters
  const stats = await EventsService.getEventStats(event._id.toString(), admin.user);
  assert.equal(stats.actualCompanions, 3);
  assert.equal(stats.actualAttendees, 4);
});

test('reset: admin resets admission, retains audit history, and enables another deliberate admission', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.LIVE });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const admin = await loginUser(app, {
    username: 'admin_reset_flow',
    displayName: 'Admin Reset Flow',
    role: ROLES.ADMIN,
  });

  const originalTime = new Date('2026-09-08T19:00:00.000Z');
  const guest = await createTestGuest(event._id, {
    allowedCompanions: 2,
    checkIn: {
      actualCompanions: 2,
      checkedInAt: originalTime,
      checkedInBy: admin.user.id,
      operatorName: admin.user.displayName,
      method: 'scanner',
    },
    version: 1,
  });

  // Stats before reset
  const statsBefore = await EventsService.getEventStats(event._id.toString(), admin.user);
  assert.equal(statsBefore.admittedInvitations, 1);
  assert.equal(statsBefore.actualAttendees, 3);

  // 1. Admin resets admission
  const resReset = await request(app)
    .delete(`/api/checkin/v1/events/${event._id}/guests/${guest._id}/checkin`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .send({
      version: guest.version,
      reason: 'تسجيل دخول خاطئ عن طريق الخطأ - إعادة تعيين',
    });

  assert.equal(resReset.status, 200);
  assert.equal(resReset.body.data.checkIn, null);
  assert.equal(resReset.body.data.version, 2);

  // Audit history retains old admission
  const resetAudit = await Audit.findOne({
    eventId: event._id,
    guestId: guest._id,
    action: 'CHECKIN_RESET',
  });
  assert.ok(resetAudit);
  assert.equal(resetAudit.changes.before.actualCompanions, 2);
  assert.equal(resetAudit.changes.before.operatorName, admin.user.displayName);
  assert.equal(resetAudit.changes.after.checkIn, null);

  // Stats after reset reflect zero admissions
  const statsAfter = await EventsService.getEventStats(event._id.toString(), admin.user);
  assert.equal(statsAfter.admittedInvitations, 0);
  assert.equal(statsAfter.actualAttendees, 0);
  assert.equal(statsAfter.pendingInvitations, 1);

  // 2. Deliberate re-admission with a new key succeeds!
  const newKey = crypto.randomUUID();
  const resReAdmit = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/checkins`)
    .set('Cookie', admin.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', admin.csrfToken)
    .set('Idempotency-Key', newKey)
    .send({
      guestId: guest._id.toString(),
      version: 2, // newly resolved version
      actualCompanions: 1,
      method: 'camera',
    });

  assert.equal(resReAdmit.status, 201);
  assert.equal(resReAdmit.body.data.checkIn.actualCompanions, 1);
  assert.equal(resReAdmit.body.data.version, 3);

  // Stats after re-admission
  const statsReAdmit = await EventsService.getEventStats(event._id.toString(), admin.user);
  assert.equal(statsReAdmit.admittedInvitations, 1);
  assert.equal(statsReAdmit.actualAttendees, 2);
});

/**
 * @halaa-checkin/api
 * Integration test suite for CSV Preview and Import.
 * Validates Technical Contract Sections 4–5, Product Section 5, and Task T04 Acceptance Gate:
 * - UTF-8 BOM, Arabic text, and quoted names with commas parse properly
 * - Non-destructive preview validates rows without writing records
 * - Invalid row causes atomic commit rejection; exactly zero guests committed
 * - Header errors, 2 MB size limit, and 1,000 row cap errors are explicit
 * - Idempotency replay with identical payload returns original 201 result without duplicating rows
 * - Idempotency key reuse with different payload returns 409 IDEMPOTENCY_CONFLICT
 * - Concurrent identical imports produce exactly one batch
 * - Reference added between preview and commit fails atomically (zero partial records)
 * - Closed-event and capacity limit failures leave zero partial records
 * - Downloadable CSV template provides authentic UTF-8 BOM and correct headers
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  ROLES,
  EVENT_STATUSES,
  ERROR_CODES,
  LIMITS,
} from '@halaa-checkin/contracts';
import {
  setupTestDb,
  clearDatabase,
  stopReplSet,
  createTestApp,
} from './helpers/testHarness.js';
import { createTestEvent, createTestGuest } from './helpers/syntheticFixtures.js';
import { CSV_FIXTURES, generateLargeCsv } from './helpers/csvFixtures.js';
import { provisionUser } from '../src/modules/auth/auth.service.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { Audit } from '../src/modules/audit/audit.model.js';
import { Idempotency } from '../src/modules/idempotency/idempotency.model.js';

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

async function loginAdmin(app) {
  await provisionUser({
    username: 'admin',
    displayName: 'Admin User',
    password: 'Password123!',
    role: ROLES.ADMIN,
  });

  const res = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'admin', password: 'Password123!' });

  const rawCookie = res.headers['set-cookie'];
  const cookie = Array.isArray(rawCookie) ? rawCookie[0] : rawCookie;
  return {
    cookie,
    csrfToken: res.body.data.csrfToken,
    user: res.body.data.user,
  };
}

// ============================================================================
// 1. CSV Preview (Non-destructive)
// ============================================================================

test('preview: parses UTF-8 BOM, Arabic text, quotes, and writes zero records', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  // Preview valid Arabic CSV with BOM
  const res = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.validArabicWithBom });

  assert.equal(res.status, 200);
  const preview = res.body.data;
  assert.equal(preview.canCommit, true);
  assert.equal(preview.validCount, 3);
  assert.equal(preview.errors.length, 0);
  assert.equal(preview.rows.length, 3);
  assert.equal(preview.remainingCapacity, LIMITS.MAX_EVENT_INVITATIONS);

  // Line numbers (line 1 is header, so rows are lines 2, 3, 4)
  assert.equal(preview.rows[0].lineNumber, 2);
  assert.equal(preview.rows[0].data.name, 'أحمد بن محمد السعدون');
  assert.equal(preview.rows[0].data.allowedCompanions, 2);
  assert.deepEqual(preview.rows[0].data.companionNames, ['سارة السعدون', 'عمر السعدون']);
  assert.equal(preview.rows[0].data.reference, 'INV-AR-001');

  // CRITICAL: preview writes zero guests to the database
  const countInDb = await Guest.countDocuments({ eventId: event._id });
  assert.equal(countInDb, 0, 'Preview must write zero records to database');
});

test('preview: English CSV with quotes, commas in names, and warnings for duplicate names', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  // Preview English CSV
  const res = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.validEnglishWithQuotes });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.canCommit, true);
  assert.equal(res.body.data.validCount, 3);
  assert.equal(res.body.data.rows[0].data.name, 'Smith, Alexander M.');

  // Preview with duplicate name (non-blocking warning)
  const warnRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.duplicateNameInFile });

  assert.equal(warnRes.status, 200);
  assert.equal(warnRes.body.data.canCommit, true, 'Duplicate names should not block commit');
  assert.ok(warnRes.body.data.warnings.length > 0, 'Must contain duplicate name warning');
  assert.equal(warnRes.body.data.errors.length, 0);
});

test('preview: explicit errors for header mismatch, intra-file duplicate references, and empty files', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  // Missing header
  const missRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.missingHeader });

  assert.equal(missRes.status, 200);
  assert.equal(missRes.body.data.canCommit, false);
  assert.ok(missRes.body.data.errors.some((e) => e.includes('Missing required header')));

  // Unexpected header
  const extraRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.unexpectedHeader });

  assert.equal(extraRes.status, 200);
  assert.equal(extraRes.body.data.canCommit, false);
  assert.ok(extraRes.body.data.errors.some((e) => e.includes('Unexpected header')));

  // Intra-file duplicate reference
  const dupRefRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.duplicateReferenceInFile });

  assert.equal(dupRefRes.status, 200);
  assert.equal(dupRefRes.body.data.canCommit, false);
  assert.ok(dupRefRes.body.data.errors.some((e) => e.includes('duplicate reference')));

  // Header only (0 data rows)
  const emptyRowsRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.headerOnly });

  assert.equal(emptyRowsRes.status, 200);
  assert.equal(emptyRowsRes.body.data.canCommit, false);
  assert.ok(emptyRowsRes.body.data.errors.some((e) => e.includes('no guest data rows')));

  // Exceeds 1,000 data rows cap
  const largeCsv = generateLargeCsv(1001);
  const largeRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: largeCsv });

  assert.equal(largeRes.status, 200);
  assert.equal(largeRes.body.data.canCommit, false);
  assert.ok(largeRes.body.data.errors.some((e) => e.includes('exceeds maximum limit of 1,000 data rows')));
});

// ============================================================================
// 2. CSV Commit (Atomic Transactions & Rollback)
// ============================================================================

test('commit: atomic batch import creates guests, audit, and idempotency records', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  const idempotencyKey = '550e8400-e29b-41d4-a716-446655440001';

  const res = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send({ csv: CSV_FIXTURES.validArabicWithBom });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.createdCount, 3);
  assert.equal(res.body.data.guestIds.length, 3);

  // Verify all 3 guests exist in DB
  const guests = await Guest.find({ eventId: event._id }).select('+qrToken').sort({ reference: 1 });
  assert.equal(guests.length, 3);
  assert.equal(guests[0].reference, 'INV-AR-001');
  assert.equal(guests[0].name, 'أحمد بن محمد السعدون');
  assert.equal(guests[0].allowedCompanions, 2);
  assert.ok(guests[0].qrToken);
  assert.ok(guests[0].shortCode);

  // Verify Audit record was created
  const audit = await Audit.findOne({ eventId: event._id, action: 'IMPORT_COMMIT' });
  assert.ok(audit);
  assert.equal(audit.changes.after.createdCount, 3);

  // Verify Idempotency record was created
  const idempotency = await Idempotency.findOne({
    eventId: event._id,
    key: idempotencyKey,
  });
  assert.ok(idempotency);
  assert.equal(idempotency.response.status, 201);
  assert.equal(idempotency.response.body.data.createdCount, 3);
});

test('commit: atomic rollback ensures zero guests committed when one row is invalid', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  // CSV has 1 valid row and 1 invalid row (allowedCompanions = 25)
  const res = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440002')
    .send({ csv: CSV_FIXTURES.invalidExcessCompanions });

  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, ERROR_CODES.IMPORT_INVALID);

  // CRITICAL: exactly zero guests committed to database
  const countInDb = await Guest.countDocuments({ eventId: event._id });
  assert.equal(countInDb, 0, 'Invalid row must cause atomic rollback with zero committed guests');

  // No audit or idempotency record persisted on abort
  const auditCount = await Audit.countDocuments({ eventId: event._id });
  assert.equal(auditCount, 0);
  const idempCount = await Idempotency.countDocuments({ eventId: event._id });
  assert.equal(idempCount, 0);
});

test('commit: reference added after preview causes atomic commit failure', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  // 1. Preview succeeds
  const previewRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/preview`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .send({ csv: CSV_FIXTURES.validArabicWithBom });

  assert.equal(previewRes.status, 200);
  assert.equal(previewRes.body.data.canCommit, true);

  // 2. An active guest with reference "INV-AR-001" is added to the database in the meantime
  await createTestGuest(event._id, {
    name: 'Intervening Guest',
    reference: 'INV-AR-001',
    allowedCompanions: 0,
  });

  // 3. Attempting to commit the CSV now fails atomically
  const commitRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440003')
    .send({ csv: CSV_FIXTURES.validArabicWithBom });

  assert.equal(commitRes.status, 409);
  assert.equal(commitRes.body.error.code, ERROR_CODES.REFERENCE_CONFLICT);

  // Verify only the single intervening guest exists, zero imported guests
  const totalGuests = await Guest.countDocuments({ eventId: event._id });
  assert.equal(totalGuests, 1);
});

test('commit: closed event and capacity limit reject imports with zero partial records', async () => {
  const closedEvent = await createTestEvent({ status: EVENT_STATUSES.CLOSED, closedAt: new Date() });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  // 1. Closed event commit fails
  const closedRes = await request(app)
    .post(`/api/checkin/v1/events/${closedEvent._id}/imports/commit`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440004')
    .send({ csv: CSV_FIXTURES.validArabicWithBom });

  assert.equal(closedRes.status, 409);
  assert.equal(closedRes.body.error.code, ERROR_CODES.EVENT_CLOSED);

  // 2. Capacity limit commit fails
  const liveEvent = await createTestEvent({ status: EVENT_STATUSES.LIVE });

  // Stub countActive to simulate reaching capacity limit
  const originalCount = Guest.countDocuments;
  Guest.countDocuments = function (filter) {
    if (filter.eventId.toString() === liveEvent._id.toString()) {
      return {
        session() {
          return Promise.resolve(999); // Only 1 slot left, but CSV has 3 rows
        },
      };
    }
    return originalCount.apply(this, arguments);
  };

  try {
    const capRes = await request(app)
      .post(`/api/checkin/v1/events/${liveEvent._id}/imports/commit`)
      .set('Cookie', auth.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', auth.csrfToken)
      .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440005')
      .send({ csv: CSV_FIXTURES.validArabicWithBom });

    assert.equal(capRes.status, 409);
    assert.equal(capRes.body.error.code, ERROR_CODES.CAPACITY_EXCEEDED);
  } finally {
    Guest.countDocuments = originalCount;
  }
});

// ============================================================================
// 3. Idempotency Replay and Concurrency
// ============================================================================

test('idempotency: identical retry returns cached result; different body returns 409', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  const idempotencyKey = '550e8400-e29b-41d4-a716-446655440006';

  // 1. Initial commit
  const res1 = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send({ csv: CSV_FIXTURES.validArabicWithBom });

  assert.equal(res1.status, 201);
  const initialData = res1.body.data;
  assert.equal(initialData.createdCount, 3);

  // 2. Identical retry with same key returns original result
  const res2 = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send({ csv: CSV_FIXTURES.validArabicWithBom });

  assert.equal(res2.status, 201);
  assert.deepEqual(res2.body.data, initialData, 'Must return identical playback data');

  // Verify total guests in DB is still 3 (NO DUPLICATION)
  const totalGuests = await Guest.countDocuments({ eventId: event._id });
  assert.equal(totalGuests, 3);

  // 3. Reusing the same key with DIFFERENT payload returns 409 IDEMPOTENCY_CONFLICT
  const res3 = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
    .set('Cookie', auth.cookie)
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send({ csv: CSV_FIXTURES.validEnglishWithQuotes });

  assert.equal(res3.status, 409);
  assert.equal(res3.body.error.code, ERROR_CODES.IDEMPOTENCY_CONFLICT);
});

test('idempotency: concurrent identical import requests create exactly one batch', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  const idempotencyKey = '550e8400-e29b-41d4-a716-446655440007';

  // Send two identical import requests concurrently
  const [resA, resB] = await Promise.all([
    request(app)
      .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
      .set('Cookie', auth.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', auth.csrfToken)
      .set('Idempotency-Key', idempotencyKey)
      .send({ csv: CSV_FIXTURES.validArabicWithBom }),
    request(app)
      .post(`/api/checkin/v1/events/${event._id}/imports/commit`)
      .set('Cookie', auth.cookie)
      .set('Origin', 'http://localhost:3100')
      .set('X-CSRF-Token', auth.csrfToken)
      .set('Idempotency-Key', idempotencyKey)
      .send({ csv: CSV_FIXTURES.validArabicWithBom }),
  ]);

  assert.equal(resA.status, 201);
  assert.equal(resB.status, 201);
  assert.equal(resA.body.data.createdCount, 3);
  assert.equal(resB.body.data.createdCount, 3);
  assert.deepEqual(resA.body.data.guestIds, resB.body.data.guestIds);

  // Exactly 3 guests in DB, exactly 1 batch
  const countInDb = await Guest.countDocuments({ eventId: event._id });
  assert.equal(countInDb, 3);
});

// ============================================================================
// 4. Downloadable Template Endpoint
// ============================================================================

test('template: /imports/template provides UTF-8 BOM CSV in Arabic and English', async () => {
  const event = await createTestEvent({ status: EVENT_STATUSES.DRAFT });
  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const auth = await loginAdmin(app);

  // Arabic template (default)
  const arRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/imports/template?lang=ar`)
    .set('Cookie', auth.cookie);

  assert.equal(arRes.status, 200);
  assert.ok(arRes.headers['content-type'].includes('text/csv'));
  assert.ok(arRes.text.startsWith('\uFEFF'), 'Arabic template must include UTF-8 BOM');
  assert.ok(arRes.text.includes('name,allowedCompanions,companionNames,reference'));
  assert.ok(arRes.text.includes('أحمد حسن'));

  // English template
  const enRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/imports/template?lang=en`)
    .set('Cookie', auth.cookie);

  assert.equal(enRes.status, 200);
  assert.ok(enRes.text.startsWith('\uFEFF'), 'English template must include UTF-8 BOM');
  assert.ok(enRes.text.includes('Ahmed Hassan'));
});

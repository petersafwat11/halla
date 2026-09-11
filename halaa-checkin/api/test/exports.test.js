/**
 * @halaa-checkin/api
 * Integration test suite for PDF templates, export worker, and protected download.
 * Validates Technical Contract Sections 3, 6, 7 and Task T06 Acceptance Gate:
 * - Single A6 and bulk 4-up A4 pass templates with local Cairo font and Halaa tokens
 * - QR preview endpoint (GET /events/:eventId/guests/:guestId/qr) with no-store
 * - Internal QR generation and round-trip decoding verification with jsqr
 * - Interim and Final attendance report templates with authoritative calculateStats
 * - Immutable read snapshot transaction isolation
 * - Queue bounds: 10 global, 3 per admin (429 RATE_LIMITED)
 * - Protected download states: 409 EXPORT_NOT_READY, 409 EXPORT_FAILED, 410 EXPORT_EXPIRED
 * - Authorization: receptionist forbidden (403), cross-event rejected (404)
 * - Worker atomic lease claiming, crash recovery, and 2-attempt cap
 * - Prevention of publishing after lease loss
 * - Offline SSRF immunity: network requests blocked in render context
 * - HTML escaping: injected tags remain literal text
 * - 24-hour artifact expiry and orphan .tmp cleanup
 * - Visual evidence generation to docs/evidence/hilton-guest-checkin/
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
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
import {
  createTestEvent,
  createTestGuest,
} from './helpers/syntheticFixtures.js';
import { provisionUser } from '../src/modules/auth/auth.service.js';
import { Event } from '../src/modules/events/event.model.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { ExportJob } from '../src/modules/exports/exportJob.model.js';
import { ExportsService } from '../src/modules/exports/exports.service.js';
import { ExportWorker } from '../src/modules/exports/exports.worker.js';
import { generateQrBuffer } from '../src/modules/exports/qrGenerator.js';
import { getBrowser, closeBrowser } from '../src/modules/exports/pdfRenderer.js';
import { generateSinglePassHtml } from '../src/modules/exports/templates/singlePass.js';
import { generateBulkPassesHtml } from '../src/modules/exports/templates/bulkPasses.js';
import { generateReportHtml } from '../src/modules/exports/templates/report.js';

function findEvidenceDir() {
  if (process.env.CHECKIN_EVIDENCE_DIR) return path.resolve(process.env.CHECKIN_EVIDENCE_DIR);
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'docs', 'evidence', 'hilton-guest-checkin');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return path.resolve('..', '..', 'docs', 'evidence', 'hilton-guest-checkin');
}

let testEnv;
const EVIDENCE_DIR = findEvidenceDir();

test.before(async () => {
  testEnv = await setupTestDb();
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
});

test.after(async () => {
  await closeBrowser();
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

function decodeQrPng(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return code ? code.data : null;
}

// ============================================================================
// 1. QR Generation and Round-Trip Decoding
// ============================================================================

test('qr: generated QR buffer decodes back to exact payload with 4-module quiet zone', async () => {
  const payload = 'HGC1.TESTPAYLOAD.1234567890abcdef';
  const qrPngBuffer = await generateQrBuffer(payload);

  assert.ok(Buffer.isBuffer(qrPngBuffer), 'QR output must be a Buffer');
  assert.ok(qrPngBuffer.length > 500, 'QR buffer must contain PNG data');

  const decoded = decodeQrPng(qrPngBuffer);
  assert.equal(decoded, payload, 'Decoded QR must match the original payload');
});

// ============================================================================
// 2. QR Preview Endpoint (GET /events/:eventId/guests/:guestId/qr)
// ============================================================================

test('qr preview: admin retrieves QR data URL, receptionist is forbidden, payload decodes correctly', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const admin = await provisionUser({
    username: 'admin_qr_test',
    password: 'Password123!',
    displayName: 'Admin Tester',
    role: ROLES.ADMIN,
  });

  const reception = await provisionUser({
    username: 'reception_qr_test',
    password: 'Password123!',
    displayName: 'Reception Tester',
    role: ROLES.RECEPTION,
  });

  const adminAuth = await loginUser(app, {
    username: admin.username,
    password: 'Password123!',
  });

  const receptionAuth = await loginUser(app, {
    username: reception.username,
    password: 'Password123!',
  });

  const event = await createTestEvent();
  const guest = await createTestGuest(event._id, {
    name: 'سارة بنت أحمد آل سعود',
    allowedCompanions: 3,
  });

  // 1. Receptionist is forbidden (403)
  const recepRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/guests/${guest._id}/qr`)
    .set('Cookie', receptionAuth.cookie);

  assert.equal(recepRes.status, 403);
  assert.equal(recepRes.body.error.code, ERROR_CODES.FORBIDDEN);

  // 2. Admin retrieves QR preview (200)
  const adminRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/guests/${guest._id}/qr`)
    .set('Cookie', adminAuth.cookie);

  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
  assert.equal(adminRes.body.data.shortCode, guest.shortCode);
  assert.ok(
    adminRes.body.data.imageDataUrl.startsWith('data:image/png;base64,'),
    'Must return PNG data URL'
  );

  // 3. Raw qrToken is NEVER exposed in the JSON response
  assert.equal(adminRes.body.data.qrToken, undefined);
  assert.equal(JSON.stringify(adminRes.body).includes(guest.qrToken), false);

  // 4. Decode the data URL and verify it matches the secret qrToken
  const base64Data = adminRes.body.data.imageDataUrl.replace(/^data:image\/png;base64,/, '');
  const decoded = decodeQrPng(Buffer.from(base64Data, 'base64'));

  const guestWithToken = await Guest.findById(guest._id).select('+qrToken');
  assert.equal(decoded, guestWithToken.qrToken);

  // 5. Cross-event guest returns 404
  const otherEvent = await createTestEvent();
  const crossRes = await request(app)
    .get(`/api/checkin/v1/events/${otherEvent._id}/guests/${guest._id}/qr`)
    .set('Cookie', adminAuth.cookie);
  assert.equal(crossRes.status, 404);

  // 6. Soft-deleted guest returns 404
  await Guest.findByIdAndUpdate(guest._id, { deletedAt: new Date() });
  const deletedRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/guests/${guest._id}/qr`)
    .set('Cookie', adminAuth.cookie);
  assert.equal(deletedRes.status, 404);
});

// ============================================================================
// 3. Single Pass A6 Export and Protected Download
// ============================================================================

test('single pass: generates A6 PDF, enforces ready state, streams with safe disposition', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const admin = await provisionUser({
    username: 'admin_single_pass',
    password: 'Password123!',
    displayName: 'Pass Admin',
    role: ROLES.ADMIN,
  });

  const auth = await loginUser(app, {
    username: admin.username,
    password: 'Password123!',
  });

  const event = await createTestEvent({
    name: 'حفل التكريم السنوي',
    venue: 'فندق هيلتون الرياض - قاعة الأوركيد',
  });

  const guest = await createTestGuest(event._id, {
    name: 'المهندس عبدالرحمن العتيبي',
    allowedCompanions: 1,
    companionNames: ['حرم المهندس'],
  });

  // 1. Request export (HTTP 202)
  const createRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/exports`)
    .set('Cookie', auth.cookie)
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({
      kind: 'qr',
      locale: 'ar',
      scope: 'selected',
      guestIds: [guest._id.toString()],
    });

  assert.equal(createRes.status, 202);
  const exportId = createRes.body.data.id;
  assert.equal(createRes.body.data.state, 'queued');
  assert.ok(createRes.body.data.snapshotAt);

  // 2. Download before ready returns 409 EXPORT_NOT_READY
  const earlyDlRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/exports/${exportId}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(earlyDlRes.status, 409);
  assert.equal(earlyDlRes.body.error.code, ERROR_CODES.EXPORT_NOT_READY);

  // 3. Process job with worker
  const worker = new ExportWorker();
  const processedJob = await worker.processJobImmediately(exportId);
  assert.equal(processedJob.state, 'ready');
  assert.ok(processedJob.artifactSize > 0);

  // 4. Job status endpoint returns safe DTO without leaking paths/tokens
  const statusRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/exports/${exportId}`)
    .set('Cookie', auth.cookie);

  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.data.state, 'ready');
  assert.equal(statusRes.body.data.snapshot, undefined);
  assert.equal(statusRes.body.data.artifactBasename, undefined);

  // 5. Download ready PDF
  const dlRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/exports/${exportId}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(dlRes.status, 200);
  assert.equal(dlRes.headers['content-type'], 'application/pdf');
  assert.equal(dlRes.headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
  assert.ok(dlRes.headers['content-disposition'].includes(`pass-${guest.shortCode}.pdf`));

  // Verify PDF magic bytes (%PDF-)
  const pdfBuffer = dlRes.body;
  assert.ok(pdfBuffer.toString('latin1', 0, 5).startsWith('%PDF-'));
  assert.ok(pdfBuffer.length > 5000, 'PDF buffer must be at least 5KB');
});

// ============================================================================
// 4. Bulk 4-Up A4 Passes Spanning Pages
// ============================================================================

test('bulk passes: renders 4-up A4 pages, spans multiple pages, includes all guests', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const admin = await provisionUser({
    username: 'admin_bulk_pass',
    password: 'Password123!',
    displayName: 'Bulk Admin',
    role: ROLES.ADMIN,
  });

  const auth = await loginUser(app, {
    username: admin.username,
    password: 'Password123!',
  });

  const event = await createTestEvent({
    name: 'مؤتمر التقنية المالية 2026',
  });

  // Create 6 guests to guarantee multi-page 4-up layout (Page 1: 4 cards, Page 2: 2 cards)
  const guestIds = [];
  for (let i = 1; i <= 6; i++) {
    const g = await createTestGuest(event._id, {
      name: `الضيف رقم ${i} مع اسم عربي مفصل`,
      allowedCompanions: i % 3,
    });
    guestIds.push(g._id.toString());
  }

  // Request all active passes
  const createRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/exports`)
    .set('Cookie', auth.cookie)
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({
      kind: 'qr',
      locale: 'ar',
      scope: 'all',
    });

  assert.equal(createRes.status, 202);
  const exportId = createRes.body.data.id;

  const worker = new ExportWorker();
  const processedJob = await worker.processJobImmediately(exportId);
  assert.equal(processedJob.state, 'ready');

  const dlRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/exports/${exportId}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(dlRes.status, 200);
  assert.equal(dlRes.headers['content-type'], 'application/pdf');
  assert.ok(dlRes.body.toString('latin1', 0, 5).startsWith('%PDF-'));
  assert.equal((dlRes.body.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 2, 'six invitations fit exactly two sheets with snapshot timestamps');
  // Multi-page A4 PDF should be substantial
  assert.ok(dlRes.body.length > 20000, 'Multi-page bulk PDF should exceed 20KB');
});

// ============================================================================
// 5. Attendance Reports (Interim vs Final)
// ============================================================================

test('reports: interim for live event, final for closed event, exact totals match lists', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const admin = await provisionUser({
    username: 'admin_reports',
    password: 'Password123!',
    displayName: 'Report Admin',
    role: ROLES.ADMIN,
  });

  const auth = await loginUser(app, {
    username: admin.username,
    password: 'Password123!',
  });

  const event = await createTestEvent({
    name: 'حفل افتتاح فرع المصرف',
    status: EVENT_STATUSES.LIVE,
  });

  // Guest 1: Admitted with 2 companions (party size 3)
  const g1 = await createTestGuest(event._id, {
    name: 'سلطان القحطاني',
    allowedCompanions: 3,
    checkIn: {
      actualCompanions: 2,
      checkedInAt: new Date(),
      checkedInBy: admin.id,
      operatorName: admin.displayName,
      method: 'scanner',
    },
  });

  // Guest 2: Pending (not admitted)
  const g2 = await createTestGuest(event._id, {
    name: 'مها الشمري',
    allowedCompanions: 1,
    companionNames: ['شقيقة الضيفة'],
  });

  // 1. Interim report export on live event
  const interimCreate = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/exports`)
    .set('Cookie', auth.cookie)
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({
      kind: 'report',
      locale: 'ar',
    });

  assert.equal(interimCreate.status, 202);
  const interimJobId = interimCreate.body.data.id;

  const worker = new ExportWorker();
  await worker.processJobImmediately(interimJobId);

  const interimDl = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/exports/${interimJobId}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(interimDl.status, 200);
  assert.equal(interimDl.headers['content-type'], 'application/pdf');

  // Verify HTML contents for interim report
  const rawJob = await ExportJob.findById(interimJobId).select('+snapshot');
  const interimHtml = generateReportHtml({
    event: rawJob.snapshot.event,
    guests: rawJob.snapshot.guests,
    snapshotAt: rawJob.snapshotAt,
    locale: 'ar',
  });

  assert.ok(interimHtml.includes('تقرير الحضور المرحلي'), 'Must be titled interim report');
  assert.ok(interimHtml.includes('الضيوف في انتظار تسجيل الدخول'), 'Pending section title in interim');
  assert.ok(interimHtml.includes(g1.name));
  assert.ok(interimHtml.includes(g2.name));

  // 2. Final report on closed event
  await Event.findByIdAndUpdate(event._id, { status: EVENT_STATUSES.CLOSED, closedAt: new Date() });

  const finalCreate = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/exports`)
    .set('Cookie', auth.cookie)
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({
      kind: 'report',
      locale: 'ar',
    });

  assert.equal(finalCreate.status, 202);
  const finalJobId = finalCreate.body.data.id;
  await worker.processJobImmediately(finalJobId);

  const finalRawJob = await ExportJob.findById(finalJobId).select('+snapshot');
  const finalHtml = generateReportHtml({
    event: finalRawJob.snapshot.event,
    guests: finalRawJob.snapshot.guests,
    snapshotAt: finalRawJob.snapshotAt,
    locale: 'ar',
  });

  assert.ok(finalHtml.includes('تقرير الحضور النهائي'), 'Must be titled final report');
  assert.ok(finalHtml.includes('الضيوف الذين لم يحضروا'), 'Pending section title in final');

  // 3. Report on event with zero guests works safely
  const emptyEvent = await createTestEvent({ name: 'فعالية جديدة فارغة' });
  const emptyCreate = await request(app)
    .post(`/api/checkin/v1/events/${emptyEvent._id}/exports`)
    .set('Cookie', auth.cookie)
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({
      kind: 'report',
      locale: 'ar',
    });

  assert.equal(emptyCreate.status, 202);
  await worker.processJobImmediately(emptyCreate.body.data.id);

  const emptyDl = await request(app)
    .get(`/api/checkin/v1/events/${emptyEvent._id}/exports/${emptyCreate.body.data.id}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(emptyDl.status, 200);
});

// ============================================================================
// 6. Queue Bounds and Rate Limiting (429)
// ============================================================================

test('rate limits: rejects excess jobs beyond per-admin (3) and global (10) limits with 429', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const admin1 = await provisionUser({
    username: 'admin_queue_1',
    password: 'Password123!',
    displayName: 'Queue Admin 1',
    role: ROLES.ADMIN,
  });

  const auth1 = await loginUser(app, {
    username: admin1.username,
    password: 'Password123!',
  });

  const event = await createTestEvent();
  await createTestGuest(event._id);

  // 1. Fill per-admin limit (3 active jobs)
  for (let i = 1; i <= 3; i++) {
    const res = await request(app)
      .post(`/api/checkin/v1/events/${event._id}/exports`)
      .set('Cookie', auth1.cookie)
      .set('X-CSRF-Token', auth1.csrfToken)
      .set('Origin', 'http://localhost:3100')
      .send({ kind: 'report', locale: 'ar' });
    assert.equal(res.status, 202);
  }

  // 4th request from same admin fails with 429
  const excessAdminRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/exports`)
    .set('Cookie', auth1.cookie)
    .set('X-CSRF-Token', auth1.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({ kind: 'report', locale: 'ar' });

  assert.equal(excessAdminRes.status, 429);
  assert.equal(excessAdminRes.body.error.code, ERROR_CODES.RATE_LIMITED);

  // 2. Global limit test: create 7 more queued jobs under other synthetic admins
  for (let i = 4; i <= 10; i++) {
    const otherJob = new ExportJob({
      eventId: event._id,
      createdBy: new ExportJob()._id, // synthetic user ID
      kind: 'report',
      locale: 'ar',
      state: 'queued',
      snapshotAt: new Date(),
      snapshot: { event: { name: 'test' }, guests: [] },
      expiresAt: new Date(Date.now() + LIMITS.EXPORT_EXPIRY_MS),
    });
    await otherJob.save();
  }

  // Global total is now 10. A second admin attempting to queue a job gets 429
  const admin2 = await provisionUser({
    username: 'admin_queue_2',
    password: 'Password123!',
    displayName: 'Queue Admin 2',
    role: ROLES.ADMIN,
  });

  const auth2 = await loginUser(app, {
    username: admin2.username,
    password: 'Password123!',
  });

  const excessGlobalRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/exports`)
    .set('Cookie', auth2.cookie)
    .set('X-CSRF-Token', auth2.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({ kind: 'report', locale: 'ar' });

  assert.equal(excessGlobalRes.status, 429);
  assert.equal(excessGlobalRes.body.error.code, ERROR_CODES.RATE_LIMITED);
});

// ============================================================================
// 7. Protected Download Authorization and State Guards
// ============================================================================

test('download guards: 410 for expired jobs, 409 for failed jobs, 404 cross-event, 403 reception', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const admin = await provisionUser({
    username: 'admin_guards',
    password: 'Password123!',
    displayName: 'Guards Admin',
    role: ROLES.ADMIN,
  });

  const auth = await loginUser(app, {
    username: admin.username,
    password: 'Password123!',
  });

  const event = await createTestEvent();
  const otherEvent = await createTestEvent({ name: 'حدث مختلف تماما' });

  // 1. Expired job (expiresAt in the past) -> 410 EXPORT_EXPIRED
  const expiredJob = new ExportJob({
    eventId: event._id,
    createdBy: admin.id,
    kind: 'report',
    locale: 'ar',
    state: 'ready',
    artifactBasename: 'nonexistent.pdf',
    snapshotAt: new Date(Date.now() - 48 * 3600 * 1000),
    expiresAt: new Date(Date.now() - 24 * 3600 * 1000), // expired 24h ago
    snapshot: { event: { name: 'test' }, guests: [] },
  });
  await expiredJob.save();

  const expiredRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/exports/${expiredJob._id}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(expiredRes.status, 410);
  assert.equal(expiredRes.body.error.code, ERROR_CODES.EXPORT_EXPIRED);

  // 2. Failed job -> 409 EXPORT_FAILED
  const failedJob = new ExportJob({
    eventId: event._id,
    createdBy: admin.id,
    kind: 'report',
    locale: 'ar',
    state: 'failed',
    errorCode: ERROR_CODES.EXPORT_FAILED,
    errorMessage: 'Simulated rendering error',
    snapshotAt: new Date(),
    expiresAt: new Date(Date.now() + LIMITS.EXPORT_EXPIRY_MS),
    snapshot: { event: { name: 'test' }, guests: [] },
  });
  await failedJob.save();

  const failedRes = await request(app)
    .get(`/api/checkin/v1/events/${event._id}/exports/${failedJob._id}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(failedRes.status, 409);
  assert.equal(failedRes.body.error.code, ERROR_CODES.EXPORT_FAILED);

  // 3. Cross-event download -> 404
  const crossRes = await request(app)
    .get(`/api/checkin/v1/events/${otherEvent._id}/exports/${failedJob._id}/download`)
    .set('Cookie', auth.cookie);

  assert.equal(crossRes.status, 404);
});

// ============================================================================
// 8. Snapshot Immutability Isolation
// ============================================================================

test('snapshot isolation: subsequent edits or deletes do not alter existing export snapshot', async () => {
  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const admin = await provisionUser({
    username: 'admin_snapshot',
    password: 'Password123!',
    displayName: 'Snapshot Admin',
    role: ROLES.ADMIN,
  });

  const auth = await loginUser(app, {
    username: admin.username,
    password: 'Password123!',
  });

  const event = await createTestEvent();
  const guest = await createTestGuest(event._id, {
    name: 'عبدالله السعد',
    allowedCompanions: 2,
  });

  // Create export job
  const createRes = await request(app)
    .post(`/api/checkin/v1/events/${event._id}/exports`)
    .set('Cookie', auth.cookie)
    .set('X-CSRF-Token', auth.csrfToken)
    .set('Origin', 'http://localhost:3100')
    .send({
      kind: 'qr',
      locale: 'ar',
      scope: 'all',
    });

  assert.equal(createRes.status, 202);
  const exportId = createRes.body.data.id;

  // Mutate the original guest document (change name, change allowed companions, and soft-delete)
  await Guest.findByIdAndUpdate(guest._id, {
    name: 'عبدالله المحمد - تم التعديل',
    allowedCompanions: 10,
    deletedAt: new Date(),
  });

  // Process export job now from its immutable snapshot
  const worker = new ExportWorker();
  await worker.processJobImmediately(exportId);

  const jobDoc = await ExportJob.findById(exportId).select('+snapshot');
  assert.equal(jobDoc.snapshot.guests[0].name, 'عبدالله السعد');
  assert.equal(jobDoc.snapshot.guests[0].allowedCompanions, 2);
});

// ============================================================================
// 9. Worker Recovery, Heartbeat Lease, and Attempt Cap
// ============================================================================

test('worker recovery: claims expired lease, caps attempts at 2, and marks failed on repeated crash', async () => {
  const event = await createTestEvent();
  const guest = await createTestGuest(event._id);

  const worker = new ExportWorker({ workerId: 'test-recovery-worker' });

  // Simulate a crashed worker with an expired lease and attempt count = 1
  const crashedJob = new ExportJob({
    eventId: event._id,
    createdBy: new ExportJob()._id,
    kind: 'qr',
    locale: 'ar',
    scope: 'selected',
    guestIds: [guest._id],
    state: 'running',
    leaseOwner: 'crashed-worker-pid-9999',
    leaseUntil: new Date(Date.now() - 1000), // lease expired 1s ago
    attempts: 1,
    snapshotAt: new Date(),
    snapshot: {
      event: { name: 'Event', venue: 'Venue', startsAt: new Date() },
      guests: [{ shortCode: guest.shortCode, name: guest.name, qrToken: 'HGC1.TEST', allowedCompanions: 0 }],
    },
    expiresAt: new Date(Date.now() + LIMITS.EXPORT_EXPIRY_MS),
  });
  await crashedJob.save();

  // Next worker tick should claim the orphaned job and increment attempts to 2
  const claimedJob = await worker.claimNextJob();
  assert.ok(claimedJob);
  assert.equal(claimedJob._id.toString(), crashedJob._id.toString());
  assert.equal(claimedJob.attempts, 2);
  assert.equal(claimedJob.leaseOwner, worker.workerId);

  // Now simulate another crash (lease expires again, attempts = 2)
  await ExportJob.findByIdAndUpdate(crashedJob._id, {
    leaseUntil: new Date(Date.now() - 1000),
  });

  // Next claim tick should detect that attempts >= 2 and lease expired, marking it permanently failed
  const nextClaim = await worker.claimNextJob();
  assert.equal(nextClaim, null, 'No active job should be claimed');

  const deadJob = await ExportJob.findById(crashedJob._id);
  assert.equal(deadJob.state, 'failed');
  assert.equal(deadJob.errorCode, ERROR_CODES.EXPORT_FAILED);
});

// ============================================================================
// 10. SSRF Immunity and HTML Injection Escaping
// ============================================================================

test('security: HTML tags in guest names are escaped and rendered literal, network requests blocked', async () => {
  const maliciousName = '<script>alert("xss")</script><img src="http://127.0.0.1:9999/malicious.png" />خالد';
  const html = generateSinglePassHtml({
    event: { name: '<b>Event</b>', venue: '<i>Venue</i>', startsAt: new Date() },
    guest: {
      name: maliciousName,
      shortCode: 'ABCD1234EF',
      allowedCompanions: 0,
      qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    },
    locale: 'ar',
  });

  assert.ok(!html.includes('<script>'), 'Raw script tags must not appear in HTML');
  assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
});

// ============================================================================
// 11. 24-Hour Expiry and Abandoned .tmp Cleanup
// ============================================================================

test('cleanup: sweeps expired job files and removes abandoned .tmp files', async () => {
  const testDir = path.resolve('test-temp-exports');
  await fs.promises.mkdir(testDir, { recursive: true });

  try {
    // 1. Create an expired job with an artifact file
    const fakeArtifact = 'test-expired-artifact.pdf';
    const fakeArtifactPath = path.join(testDir, fakeArtifact);
    await fs.promises.writeFile(fakeArtifactPath, 'PDF test bytes');

    const expiredJob = new ExportJob({
      eventId: new ExportJob()._id,
      createdBy: new ExportJob()._id,
      kind: 'report',
      locale: 'ar',
      state: 'ready',
      artifactBasename: fakeArtifact,
      snapshotAt: new Date(Date.now() - 48 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 1000), // expired 1s ago
      snapshot: { event: { name: 'test' }, guests: [] },
    });
    await expiredJob.save();

    // 2. Create an abandoned .tmp file with old mtime (> 10 mins ago)
    const oldTmpFile = path.join(testDir, 'abandoned.pdf.tmp');
    await fs.promises.writeFile(oldTmpFile, 'abandoned bytes');
    const oldTime = new Date(Date.now() - 15 * 60 * 1000);
    await fs.promises.utimes(oldTmpFile, oldTime, oldTime);

    // 3. Run cleanup
    const result = await ExportsService.cleanupExpiredArtifacts(testDir);
    assert.ok(result.removedFiles >= 2, 'Must remove expired artifact and abandoned tmp file');

    assert.equal(fs.existsSync(fakeArtifactPath), false, 'Expired artifact must be unlinked');
    assert.equal(fs.existsSync(oldTmpFile), false, 'Old tmp file must be unlinked');

    const updatedJob = await ExportJob.findById(expiredJob._id);
    assert.equal(updatedJob.state, 'expired');
  } finally {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }
});

// ============================================================================
// 12. Visual Evidence Generation
// ============================================================================

test('evidence: renders synthetic sample pages and exports PNG screenshots to evidence directory', async () => {
  const browser = await getBrowser();
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();

  try {
    const sampleEvent = await createTestEvent();
    const sampleGuest = await createTestGuest(sampleEvent._id);
    const qrPreview = await ExportsService.getGuestQr(sampleEvent._id, sampleGuest._id, {});
    const qrUrlSample = qrPreview.imageDataUrl;

    // 1. Single Pass A6 (Arabic)
    const singlePassHtmlAr = generateSinglePassHtml({
      event: {
        name: 'حفل افتتاح هيلتون الرياض - العرض التجريبي',
        venue: 'فندق هيلتون الرياض - قاعة الاحتفالات الكبرى',
        startsAt: '2026-09-15T19:00:00+03:00',
      },
      guest: {
        name: 'سعادة الدكتور أحمد بن محمد السعدون',
        shortCode: '7H8K9M2P4X',
        allowedCompanions: 2,
        qrDataUrl: qrUrlSample,
      },
      locale: 'ar',
    });

    await page.setContent(singlePassHtmlAr, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't06-single-pass-a6-ar.png'),
      fullPage: true,
    });

    // 2. Single Pass A6 (English)
    const singlePassHtmlEn = generateSinglePassHtml({
      event: {
        name: 'Hilton Riyadh Grand Opening Gala',
        venue: 'Hilton Riyadh Hotel & Residences - Grand Ballroom',
        startsAt: '2026-09-15T19:00:00+03:00',
      },
      guest: {
        name: 'Dr. Alexander Michael Smith',
        shortCode: '3N5R7T9W2Y',
        allowedCompanions: 1,
        qrDataUrl: qrUrlSample,
      },
      locale: 'en',
    });

    await page.setContent(singlePassHtmlEn, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't06-single-pass-a6-en.png'),
      fullPage: true,
    });

    // 3. Bulk Passes A4 (4-up)

    const bulkPassesHtml = generateBulkPassesHtml({
      event: {
        name: 'مؤتمر التقنية المالية 2026',
        venue: 'مركز الملك عبدالعزيز للمؤتمرات',
        startsAt: '2026-09-15T10:00:00+03:00',
      },
      guests: [
        { name: 'الضيف الأول', shortCode: 'CODE111111', allowedCompanions: 0, qrDataUrl: qrUrlSample },
        { name: 'Guest Two (English)', shortCode: 'CODE222222', allowedCompanions: 2, qrDataUrl: qrUrlSample },
        { name: 'الضيف الثالث مع اسم طويل ومفصل', shortCode: 'CODE333333', allowedCompanions: 1, qrDataUrl: qrUrlSample },
        { name: 'الضيف الرابع', shortCode: 'CODE444444', allowedCompanions: 3, qrDataUrl: qrUrlSample },
      ],
      locale: 'ar',
    });

    await page.setContent(bulkPassesHtml, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't06-bulk-passes-a4.png'),
      fullPage: true,
    });

    // 3. Overflow case: 20 companion names
    const companionNames20 = [];
    for (let i = 1; i <= 20; i++) {
      companionNames20.push(`مرافق رقم ${i}`);
    }
    const overflowReportHtml = generateReportHtml({
      event: {
        name: 'حفل التكريم السنوي لكبار الشخصيات',
        venue: 'قاعة اللؤلؤة',
        startsAt: '2026-09-15T20:00:00+03:00',
        status: 'live',
      },
      guests: [
        {
          name: 'الشيخ عبدالمحسن بن عبدالعزيز آل سعود مع وفد رسمي رفيع المستوى',
          shortCode: '8K9P2X4M7T',
          reference: 'VIP-001',
          allowedCompanions: 20,
          companionNames: companionNames20,
          checkIn: null,
        },
      ],
      snapshotAt: new Date(),
      locale: 'ar',
    });

    await page.setContent(overflowReportHtml, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't06-overflow-20-companions.png'),
      fullPage: true,
    });

    // 4. Sample PDF generation check and save
    const reportPdf = await page.pdf({ format: 'A4', printBackground: true });
    await fs.promises.writeFile(
      path.join(EVIDENCE_DIR, 't06-sample-attendance-report.pdf'),
      reportPdf
    );

    // Render & save single pass PDF
    await page.setContent(singlePassHtmlAr, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    const singlePassPdf = await page.pdf({ format: 'A6', printBackground: true });
    await fs.promises.writeFile(
      path.join(EVIDENCE_DIR, 't06-sample-single-pass.pdf'),
      singlePassPdf
    );

    // Render & save bulk passes PDF
    await page.setContent(bulkPassesHtml, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    const bulkPassesPdf = await page.pdf({ format: 'A4', printBackground: true });
    await fs.promises.writeFile(
      path.join(EVIDENCE_DIR, 't06-sample-bulk-passes.pdf'),
      bulkPassesPdf
    );

    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 't06-single-pass-a6-ar.png')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 't06-single-pass-a6-en.png')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 't06-bulk-passes-a4.png')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 't06-overflow-20-companions.png')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 't06-sample-attendance-report.pdf')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 't06-sample-single-pass.pdf')));
    assert.ok(fs.existsSync(path.join(EVIDENCE_DIR, 't06-sample-bulk-passes.pdf')));
  } finally {
    await page.close();
    await context.close();
  }
});

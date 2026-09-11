import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { setupTestDb, clearDatabase, stopReplSet } from './helpers/testHarness.js';
import { createTestEvent, createTestGuest } from './helpers/syntheticFixtures.js';
import { ensureIndexes, verifyIndexes } from '../src/db/indexes.js';
import { Session } from '../src/modules/auth/session.model.js';
import { Event } from '../src/modules/events/event.model.js';
import { Guest } from '../src/modules/guests/guest.model.js';
import { EventsService } from '../src/modules/events/events.service.js';
import { IdempotencyService } from '../src/modules/idempotency/idempotency.service.js';
import { withTransaction } from '../src/db/transaction.js';
import { CheckinsService } from '../src/modules/checkins/checkins.service.js';
import { ExportJob } from '../src/modules/exports/exportJob.model.js';
import { ExportsService } from '../src/modules/exports/exports.service.js';
import { closeBrowser } from '../src/modules/exports/pdfRenderer.js';
import { EJSON, verifyBackupManifest } from '../scripts/backup-format.mjs';

let testDb;
test.before(async () => { testDb = await setupTestDb(); });
test.beforeEach(clearDatabase);
test.after(async () => { await closeBrowser(); await stopReplSet(); });
const actor = () => ({ id: new mongoose.Types.ObjectId().toString(), displayName: 'Synthetic admin' });
const report = { kind: 'report', locale: 'en' };

test('explicit index setup repairs missing indexes with autoIndex disabled; readiness rejects wrong TTL options', async () => {
  const prior = mongoose.get('autoIndex');
  mongoose.set('autoIndex', false);
  try {
    await Session.collection.dropIndex('expiresAt_1');
    await ensureIndexes();
    await verifyIndexes();
    await Session.collection.dropIndex('expiresAt_1');
    await Session.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 60 });
    await assert.rejects(verifyIndexes, /wrong expireAfterSeconds/);
  } finally {
    await Session.collection.dropIndex('expiresAt_1');
    await ensureIndexes();
    mongoose.set('autoIndex', prior);
  }
});

test('expired idempotency record can be atomically replaced before the TTL monitor deletes it', async () => {
  const identity = { actorId: actor().id, eventId: new mongoose.Types.ObjectId(), operation: 'CHECKIN_ADMIT', key: crypto.randomUUID() };
  await IdempotencyService.record({ ...identity, requestHash: 'old', status: 201, body: {}, expiresAt: new Date(Date.now() - 1000) });
  await withTransaction(async session => {
    assert.equal(await IdempotencyService.findExisting(identity, { session }), null);
    await IdempotencyService.record({ ...identity, requestHash: 'new', status: 201, body: {} }, { session });
  });
  assert.equal((await IdempotencyService.findExisting(identity)).requestHash, 'new');
});

test('backup and restore CLI rehearsal round trips a real disposable replica-set database', async () => {
  const event = await createTestEvent({ status: 'live' });
  const admitted = await createTestGuest(event._id);
  await createTestGuest(event._id);
  await CheckinsService.admitGuest(String(event._id), { guestId: String(admitted._id), version: 1, actualCompanions: 0, method: 'manual' }, crypto.randomUUID(), actor());
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-cli-backup-'));
  const target = `halaa_checkin_restore_${crypto.randomBytes(6).toString('hex')}`;
  const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const options = { cwd: apiRoot, windowsHide: true, timeout: 30000, env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: testDb.uri, MONGODB_DB_NAME: testDb.dbName, MONGODB_TLS_CERT_PATH: '' } };
  try {
    await promisify(execFile)(process.execPath, ['scripts/backup-db.mjs', '--outDir', backupDir], options);
    const restored = await promisify(execFile)(process.execPath, ['scripts/restore-verify.mjs', '--sourceDir', backupDir, '--targetDb', target, '--confirm'], options);
    assert.match(restored.stdout, /all checks passed/);
  } finally {
    await mongoose.connection.getClient().db(target).dropDatabase();
    fs.rmSync(backupDir, { recursive: true });
  }
});

test('purge fence rejects reopening and export creation; purge CLI removes only the selected event', async () => {
  const event = await createTestEvent({ status: 'live' });
  const other = await createTestEvent({ name: 'Other event remains' });
  await createTestGuest(event._id);
  const survivor = await createTestGuest(other._id);
  await Event.updateOne({ _id: event._id }, { $set: { status: 'closed', purgingAt: new Date() } });
  await assert.rejects(() => EventsService.updateEventStatus(String(event._id), { version: event.version, status: 'live', reason: 'Attempt to reopen during purge' }, actor()), err => err.status === 404);
  await assert.rejects(() => ExportsService.createExportJob(String(event._id), report, actor()), err => err.status === 404);
  const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await promisify(execFile)(process.execPath, ['scripts/purge-event.mjs', '--eventId', String(event._id), '--confirm'], { cwd: apiRoot, windowsHide: true, timeout: 30000, env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: testDb.uri, MONGODB_DB_NAME: testDb.dbName, MONGODB_TLS_CERT_PATH: '' } });
  assert.match(result.stdout, /fully purged/);
  assert.equal(await Event.findById(event._id), null);
  assert.equal(await Guest.countDocuments({ eventId: event._id }), 0);
  assert.ok(await Guest.findById(survivor._id));
});

test('simultaneous enqueue enforces 3/admin and 10 global; terminal and expired jobs free capacity without cleanup counters', async () => {
  const event = await createTestEvent();
  const admin = actor();
  const enqueue = (user) => ExportsService.createExportJob(String(event._id), report, user);
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => enqueue(admin)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
  for (const r of results.filter(r => r.status === 'rejected')) assert.equal(r.reason.status, 429);
  const others = [actor(), actor(), actor(), actor()];
  const global = await Promise.allSettled(others.flatMap(user => Array.from({ length: 3 }, () => enqueue(user))));
  assert.equal(global.filter(r => r.status === 'fulfilled').length, 7);
  assert.equal(await ExportJob.countDocuments({ state: 'queued' }), 10);
  await ExportJob.updateMany({ createdBy: admin.id }, { $set: { state: 'failed' } });
  assert.equal((await enqueue(admin)).state, 'queued');
  await ExportJob.updateMany({}, { $set: { expiresAt: new Date(0) } });
  assert.equal((await enqueue(admin)).state, 'queued');
});

test('expiry clears hidden snapshot, survives repeated cleanup, and retains an expired status until TTL', async () => {
  const event = await createTestEvent();
  const job = await ExportJob.create({ eventId: event._id, createdBy: actor().id, kind: 'report', locale: 'en', state: 'ready', snapshotAt: new Date(), expiresAt: new Date(0), snapshot: { guests: [{ qrToken: 'private-test-token', name: 'Private' }] } });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-expiry-'));
  try {
    assert.equal((await ExportsService.cleanupExpiredArtifacts(dir)).failures, 0);
    assert.equal((await ExportsService.cleanupExpiredArtifacts(dir)).failures, 0);
    const fresh = await ExportJob.findById(job._id).select('+snapshot').lean();
    assert.equal(fresh.state, 'expired');
    assert.equal(fresh.snapshot, undefined);
    assert.ok(fresh.deleteAt instanceof Date);
  } finally { fs.rmSync(dir, { recursive: true }); }
});

test('download does not expose internal error messages or accept sibling-directory traversal', async () => {
  const event = await createTestEvent();
  const job = await ExportJob.create({ eventId: event._id, createdBy: actor().id, kind: 'report', locale: 'en', state: 'failed', errorMessage: 'C:/secret/credentials', snapshotAt: new Date(), expiresAt: new Date(Date.now() + 100000) });
  await assert.rejects(() => ExportsService.getDownloadStream(String(event._id), String(job._id)), err => !err.message.includes('secret'));
  await ExportJob.updateOne({ _id: job._id }, { $set: { state: 'ready', artifactBasename: '../exports-evil/stolen.pdf' } });
  await assert.rejects(() => ExportsService.getDownloadStream(String(event._id), String(job._id)), err => err.status === 403);
});

test('backup EJSON round trips ObjectId, Date, numeric versions and nested snapshot values; manifest rejects corrupt/unlisted files', () => {
  const doc = { _id: new mongoose.Types.ObjectId(), version: 2, date: new Date(), snapshot: { count: 3 } };
  const payload = EJSON.stringify([doc], { relaxed: false });
  const [restored] = EJSON.parse(payload);
  assert.equal(String(restored._id), String(doc._id));
  assert.equal(restored.date.toISOString(), doc.date.toISOString());
  assert.equal(restored.version, 2);
  assert.equal(restored.snapshot.count, 3);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-backup-'));
  const file = path.join(dir, 'events.json');
  fs.writeFileSync(file, payload);
  const manifest = { mode: 'json', dbName: 'halaa_checkin_test', files: [{ name: 'events.json', sha256: crypto.createHash('sha256').update(payload).digest('hex') }] };
  try {
    verifyBackupManifest(dir, manifest);
    fs.writeFileSync(file, 'corrupt');
    assert.throws(() => verifyBackupManifest(dir, manifest), /checksum/);
    fs.writeFileSync(file, payload);
    fs.writeFileSync(path.join(dir, 'guests.json'), '[]');
    assert.throws(() => verifyBackupManifest(dir, manifest), /Unlisted/);
  } finally { fs.rmSync(dir, { recursive: true }); }
});

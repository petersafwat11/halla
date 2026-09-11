// Explicit, synthetic local rehearsal; not part of fast default unit tests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-capacity-'));
process.env.EXPORT_DIR = dir;
process.env.NODE_ENV = 'test';
const { setupTestDb, stopReplSet, createTestApp } = await import('../../api/test/helpers/testHarness.js');
const { createTestEvent, buildSyntheticGuestBatch } = await import('../../api/test/helpers/syntheticFixtures.js');
const { Guest } = await import('../../api/src/modules/guests/guest.model.js');
const { provisionUser } = await import('../../api/src/modules/auth/auth.service.js');
const { ExportsService } = await import('../../api/src/modules/exports/exports.service.js');
const { ExportWorker } = await import('../../api/src/modules/exports/exports.worker.js');
const { closeBrowser } = await import('../../api/src/modules/exports/pdfRenderer.js');
let server;
const evidence = process.env.CHECKIN_EVIDENCE_DIR;
try {
  await setupTestDb();
  const event = await createTestEvent({ status: 'live' });
  const docs = await buildSyntheticGuestBatch(event._id, 1000);
  const guests = await Guest.insertMany(docs);
  const admin = await provisionUser({ username: 'capacity_admin', displayName: 'Synthetic Admin', password: 'Password123!', role: 'admin', assignedEventIds: [] });
  const accounts = await Promise.all([1, 2].map(i => provisionUser({ username: `capacity_reception_${i}`, displayName: `Reception ${i}`, password: 'Password123!', role: 'reception', assignedEventIds: [String(event._id)] })));
  server = createTestApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/checkin/v1`;
  const clients = [];
  for (const account of accounts) {
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: 'http://localhost:3100', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: account.username, password: 'Password123!' }) });
    assert.equal(response.status, 200);
    clients.push({ Origin: 'http://localhost:3100', 'Content-Type': 'application/json', Cookie: response.headers.get('set-cookie').split(';')[0], 'X-CSRF-Token': (await response.json()).data.csrfToken });
  }
  const job = await ExportsService.createExportJob(String(event._id), { kind: 'qr', scope: 'all', locale: 'ar' }, admin);
  const worker = new ExportWorker({ exportDir: dir });
  const start = performance.now();
  let renderMs;
  const rendering = worker.processJobImmediately(job.id).then(result => { renderMs = performance.now() - start; assert.equal(result.state, 'ready'); return result; });
  const times = [];
  await Promise.all(clients.map(async (headers, lane) => {
    for (let i = 0; i < 100; i++) {
      const guest = guests[lane * 100 + i];
      const began = performance.now();
      const preview = await fetch(`${base}/events/${event._id}/gate/resolve`, { method: 'POST', headers, body: JSON.stringify({ guestId: String(guest._id) }) });
      assert.equal(preview.status, 200);
      const data = (await preview.json()).data.guest;
      const admit = await fetch(`${base}/events/${event._id}/checkins`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ guestId: data.id, version: data.version, actualCompanions: 0, method: 'manual' }) });
      assert.equal(admit.status, 201);
      await admit.json();
      times.push(performance.now() - began);
    }
  }));
  const result = await rendering;
  const pageCount = (fs.readFileSync(path.join(dir, result.artifactBasename)).toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  assert.equal(pageCount, 250, '1000 passes must occupy exactly 250 four-up sheets');
  times.sort((a, b) => a - b);
  const report = { node: process.version, invitations: 1000, pdfPages: pageCount, receptionists: 2, admissions: times.length, exportMs: Math.round(renderMs), previewPlusAdmissionP95Ms: Math.round(times[Math.floor(times.length * 0.95)]), previewPlusAdmissionMaxMs: Math.round(times.at(-1)), pdfBytes: result.artifactSize, budgets: { exportMs: 90000, previewPlusAdmissionP95Ms: 1500 } };
  assert.equal(await Guest.countDocuments({ eventId: event._id, checkIn: { $ne: null } }), 200);
  assert.ok(renderMs < 90000, '1000-pass job must complete inside worker deadline');
  assert.ok(report.previewPlusAdmissionP95Ms < 1500, 'local rehearsal gate latency budget');
  if (evidence) {
    fs.mkdirSync(evidence, { recursive: true });
    fs.copyFileSync(path.join(dir, result.artifactBasename), path.join(evidence, 'capacity-1000-passes.pdf'));
    fs.writeFileSync(path.join(evidence, 'capacity.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await closeBrowser();
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  await stopReplSet();
  fs.rmSync(dir, { recursive: true, force: true });
}

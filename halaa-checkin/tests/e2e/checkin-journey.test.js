/**
 * @halaa-checkin — T11 end-to-end rehearsal (disposable replica-set DB + local web/API).
 *
 * Boots a real API listener on an ephemeral port (backed by MongoMemoryReplSet)
 * and a real production `next start` web server, then drives the full demo
 * journey over HTTP: login -> event lifecycle -> guest CRUD -> gate
 * preview/confirm (incl. lost-response retry + duplicate) -> stats -> CSV
 * import -> QR + report PDF export/download -> restart persistence -> logout.
 *
 * Prerequisites: `npm run build` (production web bundle) and a Chromium
 * binary resolvable via api/src/modules/exports/chromium.js
 * (local Edge/Chrome, or CHROMIUM_PATH=/usr/bin/chromium in CI).
 *
 * API modules are dynamically imported AFTER process.env.EXPORT_DIR is set,
 * because api config is captured at module load.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_PORT = 3120;
const ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const SESSION_SECRET = 'e2e-session-secret-at-least-32-chars-long!';

describe('T11 — Container-equivalent E2E journey on disposable DB', { timeout: 180000 }, () => {
  let replSet;
  let dbName;
  let apiServer;
  let apiBase;
  let webProcess;
  let ROLES;
  let createApp;
  let loadConfig;
  let ensureIndexes;
  let provisionUser;
  let Guest;
  let exportWorker;

  const json = (v) => JSON.stringify(v);

  /** Minimal cookie jar: keep the session cookie value across requests. */
  function makeClient() {
    let cookie = '';
    let csrf = '';
    return {
      setSession(setCookieHeader, csrfToken) {
        const raw = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
        cookie = String(raw).split(';')[0];
        csrf = csrfToken;
      },
      headers(extra = {}, { withCsrf = true } = {}) {
        const h = {
          'Content-Type': 'application/json',
          Origin: ORIGIN,
          ...extra,
        };
        if (cookie) h.Cookie = cookie;
        if (withCsrf && csrf) h['X-CSRF-Token'] = csrf;
        return h;
      },
      get cookie() {
        return cookie;
      },
    };
  }

  async function api(method, urlPath, client, body, { idempotencyKey } = {}) {
    const res = await fetch(`${apiBase}${urlPath}`, {
      method,
      headers: client.headers(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      body: body === undefined ? undefined : json(body),
    });
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    return { status: res.status, headers: res.headers, body: parsed, raw: text };
  }

  before(async () => {
    const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'halaa-checkin-e2e-'));
    process.env.EXPORT_DIR = exportDir;
    process.env.DEMO_SEED_ENABLED = 'false';

    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    const uri = replSet.getUri();
    dbName = `halaa_checkin_e2e_${crypto.randomBytes(6).toString('hex')}`;

    ({ createApp } = await import('../../api/src/app.js'));
    ({ loadConfig } = await import('../../api/src/config.js'));
    ({ ensureIndexes } = await import('../../api/src/db/indexes.js'));
    ({ provisionUser } = await import('../../api/src/modules/auth/auth.service.js'));
    ({ Guest } = await import('../../api/src/modules/guests/guest.model.js'));
    ({ exportWorker } = await import('../../api/src/modules/exports/exports.worker.js'));
    ({ ROLES } = await import('../../contracts/src/constants.js'));

    await mongoose.connect(uri, { dbName, autoIndex: true });
    await ensureIndexes();

    const cfg = loadConfig({
      env: 'test',
      mongodbUri: uri,
      mongodbDbName: dbName,
      appOrigin: ORIGIN,
      sessionSecret: SESSION_SECRET,
      exportDir,
      trustProxyHops: 0,
    });
    const app = createApp({ config: cfg });
    await new Promise((resolve) => {
      apiServer = app.listen(0, '127.0.0.1', resolve);
    });
    apiBase = `http://127.0.0.1:${apiServer.address().port}`;

    // Production web server (requires `npm run build` first).
    const webBuild = path.resolve(__dirname, '../../web/.next');
    assert.ok(fs.existsSync(webBuild), 'web/.next missing: run `npm run build` before `npm run test:e2e`');
    const webDir = path.resolve(__dirname, '../../web');
    webProcess = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'start', '-p', String(WEB_PORT)], {
      cwd: webDir,
      env: { ...process.env, NODE_ENV: 'production', PORT: String(WEB_PORT) },
      shell: true,
      stdio: 'pipe',
    });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`${ORIGIN}/ar/login`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {
        // Still starting.
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.ok(ready, `production web server did not start on ${ORIGIN}`);
  });

  after(async () => {
    try {
      await exportWorker.stop();
    } catch {
      // Ignore worker shutdown errors.
    }
    if (apiServer) await new Promise((r) => apiServer.close(r));
    if (webProcess?.pid) {
      try {
        if (process.platform === 'win32') spawn('taskkill', ['/pid', String(webProcess.pid), '/T', '/F']);
        else webProcess.kill('SIGTERM');
      } catch {
        // Ignore termination errors.
      }
    }
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.db.dropDatabase();
      } catch {
        // Ignore drop errors.
      }
      await mongoose.disconnect();
    }
    if (replSet) await replSet.stop();
  });

  it('full journey: auth, lifecycle, gate, import, export, restart, logout', async () => {
    const admin = makeClient();
    const reception = makeClient();

    // 1. Health: liveness always, readiness only with DB + indexes.
    {
      const live = await fetch(`${apiBase}/api/checkin/v1/health/live`);
      assert.equal(live.status, 200);
      const ready = await fetch(`${apiBase}/api/checkin/v1/health/ready`);
      assert.equal(ready.status, 200);
    }

    // 2. Provision named users, login over HTTP, capture cookie + CSRF.
    await provisionUser({ username: 'e2e_admin', displayName: 'E2E Admin', password: 'Password123!', role: ROLES.ADMIN, assignedEventIds: [] });
    {
      const res = await fetch(`${apiBase}/api/checkin/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: json({ username: 'e2e_admin', password: 'Password123!' }),
      });
      assert.equal(res.status, 200);
      const setCookie = res.headers.get('set-cookie') || '';
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Lax/i);
      const body = await res.json();
      admin.setSession(setCookie, body.data.csrfToken);
      assert.ok(admin.cookie.length > 0 && body.data.csrfToken.length > 0);
    }

    // 3. Event lifecycle: draft -> live.
    let eventId;
    let eventVersion = 1;
    {
      const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const created = await api('POST', '/api/checkin/v1/events', admin, {
        name: 'E2E Synthetic Wedding',
        venue: 'E2E Grand Hall',
        startsAt,
        timezone: 'Asia/Riyadh',
      });
      assert.equal(created.status, 201);
      eventId = created.body.data.id;
      assert.equal(created.body.data.status, 'draft');

      const opened = await api('POST', `/api/checkin/v1/events/${eventId}/status`, admin, {
        version: eventVersion,
        status: 'live',
      });
      assert.equal(opened.status, 200);
      assert.equal(opened.body.data.status, 'live');
      eventVersion = opened.body.data.version;
    }

    // 4. Guest CRUD: Arabic + English names.
    const guestIds = [];
    {
      const seeds = [
        { name: 'ليلى بنت خالد العتيبي', allowedCompanions: 2, companionNames: ['الزوج', 'الابنة'] },
        { name: 'John Carter', allowedCompanions: 0, companionNames: [] },
        { name: 'عمر فاروق Smith', allowedCompanions: 1, companionNames: ['Sara'] },
      ];
      for (const g of seeds) {
        const res = await api('POST', `/api/checkin/v1/events/${eventId}/guests`, admin, g);
        assert.equal(res.status, 201);
        assert.equal(res.body.data.qrToken, undefined);
        guestIds.push({ id: res.body.data.id, version: res.body.data.version });
      }
    }

    // 5. Reception login (assigned to the event via re-provision).
    await provisionUser({ username: 'e2e_reception', displayName: 'E2E Reception', password: 'Password123!', role: ROLES.RECEPTION, assignedEventIds: [eventId] });
    {
      const res = await fetch(`${apiBase}/api/checkin/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: json({ username: 'e2e_reception', password: 'Password123!' }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      reception.setSession(res.headers.get('set-cookie') || '', body.data.csrfToken);
    }

    // 6. Resolve is read-only: preview must not admit.
    let qrToken;
    {
      const inDb = await Guest.findById(guestIds[0].id).select('+qrToken').lean();
      qrToken = inDb.qrToken;
      const preview = await api('POST', `/api/checkin/v1/events/${eventId}/gate/resolve`, reception, { token: qrToken });
      assert.equal(preview.status, 200);
      assert.equal(preview.body.data.guest.checkIn, null);
      const stats = await api('GET', `/api/checkin/v1/events/${eventId}/stats`, reception);
      assert.equal(stats.body.data.admittedInvitations, 0);
    }

    // 7. Confirm once; lost-response retry (same key) returns one admission;
    //    second key gets ALREADY_CHECKED_IN, not a second count.
    const admissionKey = crypto.randomUUID();
    {
      const first = await api('POST', `/api/checkin/v1/events/${eventId}/checkins`, reception, {
        guestId: guestIds[0].id,
        version: guestIds[0].version,
        actualCompanions: 1,
        method: 'manual',
      }, { idempotencyKey: admissionKey });
      assert.equal(first.status, 201);

      const retry = await api('POST', `/api/checkin/v1/events/${eventId}/checkins`, reception, {
        guestId: guestIds[0].id,
        version: guestIds[0].version,
        actualCompanions: 1,
        method: 'manual',
      }, { idempotencyKey: admissionKey });
      assert.equal(retry.status, 201);
      assert.deepEqual(retry.body, first.body);

      const duplicate = await api('POST', `/api/checkin/v1/events/${eventId}/checkins`, reception, {
        guestId: guestIds[0].id,
        version: guestIds[0].version + 1,
        actualCompanions: 1,
        method: 'manual',
      }, { idempotencyKey: crypto.randomUUID() });
      assert.equal(duplicate.status, 409);
      assert.equal(duplicate.body.error.code, 'ALREADY_CHECKED_IN');
    }

    // 8. Stats reflect exactly one admission.
    {
      const stats = await api('GET', `/api/checkin/v1/events/${eventId}/stats`, admin);
      assert.equal(stats.body.data.totalInvitations, 3);
      assert.equal(stats.body.data.admittedInvitations, 1);
      assert.equal(stats.body.data.actualAttendees, 2);
    }

    // 9. CSV import: preview writes nothing; commit is atomic + idempotent.
    const csvBody = 'name,allowedCompanions,companionNames,reference\nE2E Guest One,1,Plus One,E2E-001\nE2E Guest Two,0,,E2E-002\n';
    {
      const preview = await api('POST', `/api/checkin/v1/events/${eventId}/imports/preview`, admin, { csv: csvBody });
      assert.equal(preview.status, 200);
      assert.equal(preview.body.data.validCount, 2);
      const importKey = crypto.randomUUID();
      const commit = await api('POST', `/api/checkin/v1/events/${eventId}/imports/commit`, admin, { csv: csvBody }, { idempotencyKey: importKey });
      assert.equal(commit.status, 201);
      assert.equal(commit.body.data.createdCount, 2);
      const replay = await api('POST', `/api/checkin/v1/events/${eventId}/imports/commit`, admin, { csv: csvBody }, { idempotencyKey: importKey });
      assert.equal(replay.status, 201);
      assert.deepEqual(replay.body, commit.body);
    }

    // 10. QR export (all): 202 -> worker renders -> ready -> PDF download.
    //     Unauthenticated download through the WEB origin must not succeed.
    {
      const created = await api('POST', `/api/checkin/v1/events/${eventId}/exports`, admin, {
        kind: 'qr',
        locale: 'ar',
        scope: 'all',
      });
      assert.equal(created.status, 202);
      const exportId = created.body.data.id;
      await exportWorker.processJobImmediately(exportId);
      const status = await api('GET', `/api/checkin/v1/events/${eventId}/exports/${exportId}`, admin);
      assert.equal(status.body.data.state, 'ready');

      const dl = await fetch(`${apiBase}/api/checkin/v1/events/${eventId}/exports/${exportId}/download`, {
        headers: admin.headers({}, { withCsrf: false }),
      });
      assert.equal(dl.status, 200);
      assert.match(dl.headers.get('content-type') || '', /application\/pdf/);
      assert.match(dl.headers.get('cache-control') || '', /no-store/);
      const bytes = Buffer.from(await dl.arrayBuffer());
      assert.ok(bytes.subarray(0, 5).toString() === '%PDF-');

      const viaWeb = await fetch(`${ORIGIN}/api/checkin/v1/events/${eventId}/exports/${exportId}/download`);
      assert.notEqual(viaWeb.status, 200);
    }

    // 11. Attendance report export renders with snapshot totals.
    {
      const created = await api('POST', `/api/checkin/v1/events/${eventId}/exports`, admin, {
        kind: 'report',
        locale: 'en',
      });
      assert.equal(created.status, 202);
      const exportId = created.body.data.id;
      await exportWorker.processJobImmediately(exportId);
      const dl = await fetch(`${apiBase}/api/checkin/v1/events/${eventId}/exports/${exportId}/download`, {
        headers: admin.headers({}, { withCsrf: false }),
      });
      assert.equal(dl.status, 200);
    }

    // 12. Production web serves the bilingual shell (no guest data embedded).
    {
      for (const lang of ['ar', 'en']) {
        const page = await fetch(`${ORIGIN}/${lang}/login`);
        assert.equal(page.status, 200);
        const html = await page.text();
        assert.ok(!html.includes(qrToken), 'QR token must never be embedded in web HTML');
      }
    }

    // 13. Restart persistence: new listener, same DB -> session + data intact.
    {
      await new Promise((r) => apiServer.close(r));
      const cfg = loadConfig({
        env: 'test',
        mongodbUri: replSet.getUri(),
        mongodbDbName: dbName,
        appOrigin: ORIGIN,
        sessionSecret: SESSION_SECRET,
        exportDir: process.env.EXPORT_DIR,
        trustProxyHops: 0,
      });
      await new Promise((resolve) => {
        apiServer = createApp({ config: cfg }).listen(0, '127.0.0.1', resolve);
      });
      apiBase = `http://127.0.0.1:${apiServer.address().port}`;
      const session = await fetch(`${apiBase}/api/checkin/v1/auth/session`, {
        headers: { Cookie: admin.cookie },
      });
      assert.equal(session.status, 200);
      const stats = await api('GET', `/api/checkin/v1/events/${eventId}/stats`, admin);
      assert.equal(stats.body.data.totalInvitations, 5);
      assert.equal(stats.body.data.admittedInvitations, 1);
    }

    // 14. Logout revokes the session.
    {
      const out = await fetch(`${apiBase}/api/checkin/v1/auth/logout`, {
        method: 'POST',
        headers: admin.headers({}),
      });
      assert.equal(out.status, 204);
      const after = await fetch(`${apiBase}/api/checkin/v1/auth/session`, {
        headers: { Cookie: admin.cookie },
      });
      assert.equal(after.status, 401);
    }
  });
});

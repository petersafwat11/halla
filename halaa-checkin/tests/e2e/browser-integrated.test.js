import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright-core';
import { setupTestDb, stopReplSet } from '../../api/test/helpers/testHarness.js';
import { createApp } from '../../api/src/app.js';
import { provisionUser } from '../../api/src/modules/auth/auth.service.js';
import { Event } from '../../api/src/modules/events/event.model.js';
import { Guest } from '../../api/src/modules/guests/guest.model.js';
import { Session } from '../../api/src/modules/auth/session.model.js';
import { CheckinsService } from '../../api/src/modules/checkins/checkins.service.js';
import { findChromiumExecutable } from '../../api/src/modules/exports/chromium.js';
import { closeBrowser } from '../../api/src/modules/exports/pdfRenderer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => server && new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });

test('real browser → frontend → Express → replica set: first event, guest, CSV, gate uncertainty, reauthentication, reset truth and logout', { timeout: 180000 }, async () => {
  let apiServer, front, nextProcess, browser;
  let nextPort, apiPort;
  const errors = [];
  try {
    const env = await setupTestDb();
    // Same-origin reverse proxy, like production Caddy. No fabricated DTOs.
    front = http.createServer((req, res) => {
      const port = req.url.startsWith('/api/checkin/') ? apiPort : nextPort;
      const upstream = http.request({ hostname: '127.0.0.1', port, path: req.url, method: req.method, headers: req.headers }, response => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
      req.pipe(upstream);
    });
    await listen(front);
    const origin = `http://127.0.0.1:${front.address().port}`;
    apiServer = http.createServer(createApp({ config: { ...env.config, appOrigin: origin } }));
    await listen(apiServer);
    apiPort = apiServer.address().port;
    const portProbe = http.createServer();
    await listen(portProbe);
    nextPort = portProbe.address().port;
    await close(portProbe);
    nextProcess = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(nextPort)], { cwd: path.join(root, 'web'), env: { ...process.env, NODE_ENV: 'production' }, windowsHide: true, stdio: 'pipe' });
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${origin}/en/login`)).ok) break; } catch { /* starting */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const admin = await provisionUser({ username: 'browser_admin', displayName: 'Browser Admin', password: 'Password123!', role: 'admin', assignedEventIds: [] });
    browser = await chromium.launch({ executablePath: findChromiumExecutable(), headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    async function login() {
      await page.locator('input[name="username"]').fill('browser_admin');
      await page.locator('input[name="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();
    }
    await page.goto(`${origin}/en/login`);
    await login();
    await page.getByTestId('create-first-event-btn').click();
    await page.locator('input[name="name"]').fill('Browser review event');
    await page.locator('input[name="venue"]').fill('Synthetic hall');
    await page.locator('input[name="startsDate"]').fill('2026-10-10');
    await page.locator('input[name="startsTime"]').fill('19:00');
    await page.getByTestId('event-submit-btn').click();
    await page.getByTestId('open-event-btn').click();
    await page.getByTestId('lifecycle-confirm-btn').click();
    await page.getByTestId('close-event-btn').waitFor();
    const event = await Event.findOne({ name: 'Browser review event' });
    assert.equal(event.status, 'live');
    await page.getByTestId('add-guest-btn').click();
    await page.getByTestId('guest-name-input').fill('Browser Guest');
    await page.getByTestId('guest-companions-input').fill('2');
    await page.getByTestId('guest-submit-btn').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const guest = await Guest.findOne({ eventId: event._id, name: 'Browser Guest' });
    assert.ok(guest);
    await page.getByTestId('import-csv-btn').click();
    await page.locator('input[type="file"]').setInputFiles({ name: 'synthetic.csv', mimeType: 'text/csv', buffer: Buffer.from('name,allowedCompanions,companionNames,reference\nCSV Review,1,Companion,CSV-REVIEW') });
    await page.getByTestId('preview-csv-btn').click();
    await page.getByTestId('import-preview-rows').waitFor();
    assert.match(await page.getByTestId('import-preview-rows').innerText(), /CSV Review/);
    await page.getByTestId('commit-import-btn').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await Guest.countDocuments({ eventId: event._id }), 2);
    await Event.insertMany(Array.from({ length: 100 }, (_, i) => ({ name: `Pagination fixture ${i}`, venue: 'Synthetic hall', startsAt: new Date('2060-01-01'), status: 'draft' })));
    // Selected event is now beyond the first 100-event page.
    await page.goto(`${origin}/en/guests?eventId=${event._id}`);
    await page.getByTestId(`guest-row-${guest._id}`).waitFor();
    await page.getByRole('link', { name: 'Gate', exact: true }).click();
    await page.getByTestId('toggle-camera-btn').waitFor();
    // Synthetic camera uses a real MediaStream/video/decoder. First cancel a
    // pending permission result and assert the late-acquired track is stopped.
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.releaseCamera = resolve; });
    });
    await page.getByTestId('toggle-camera-btn').click();
    await page.getByTestId('toggle-camera-btn').click();
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      window.lateStream = canvas.captureStream();
      window.releaseCamera(window.lateStream);
    });
    await page.waitForFunction(() => window.lateStream.getTracks().every(track => track.readyState === 'ended'));
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 720; canvas.height = 720;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 720, 720);
        window.cameraCanvas = canvas;
        window.cameraStream = canvas.captureStream(10);
        return window.cameraStream;
      };
    });
    await page.getByTestId('toggle-camera-btn').click();
    await page.waitForFunction(() => document.querySelector('[data-testid="camera-video"]')?.srcObject === window.cameraStream);
    const qr = await (await context.request.get(`${origin}/api/checkin/v1/events/${event._id}/guests/${guest._id}/qr`)).json();
    await page.evaluate(async dataUrl => {
      const img = new Image(); img.src = dataUrl; await img.decode();
      const ctx = window.cameraCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 80, 80, 560, 560);
      window.cameraStream.getVideoTracks()[0].requestFrame();
    }, qr.data.imageDataUrl);
    await page.getByTestId('admit-guest-btn').waitFor().catch(async error => {
      console.error('Camera diagnostics', await page.evaluate(() => ({ text: document.body.innerText, video: document.querySelector('video') && { ready: document.querySelector('video').readyState, paused: document.querySelector('video').paused }, tracks: window.cameraStream?.getTracks().map(t => t.readyState) })), errors);
      throw error;
    });
    assert.ok(await page.evaluate(() => window.cameraStream.getTracks().every(track => track.readyState === 'ended')));
    await page.getByTestId('companions-stepper-increment').click();
    const writes = [];
    page.on('request', req => { if (req.method() === 'POST' && req.url().endsWith('/checkins')) writes.push({ key: req.headers()['idempotency-key'], body: req.postDataJSON() }); });
    // Commit the real request then discard its response at the network boundary.
    await page.route('**/checkins', async route => { await route.fetch(); await route.abort('failed'); }, { times: 1 });
    await page.getByTestId('admit-guest-btn').click();
    await page.getByTestId('lost-response-card').waitFor();
    const admitted = await Guest.findById(guest._id);
    assert.equal(admitted.checkIn.actualCompanions, 1);
    // Another admin resets the admission before the uncertain operator retries.
    await CheckinsService.resetAdmission(String(event._id), String(guest._id), { version: admitted.version, reason: 'Synthetic reset for replay regression' }, { id: admin.id, displayName: admin.displayName });
    await page.getByTestId('verify-status-btn').click();
    await page.getByTestId('lost-response-card').waitFor();
    assert.equal(await page.getByTestId('admit-guest-btn').count(), 0, 'a read of no admission cannot discard an unresolved write');
    // Expire the actual cookie, trigger central 401, and log back in.
    await Session.deleteMany({});
    await page.evaluate(async () => { await fetch('/api/checkin/v1/auth/session'); });
    await page.getByTestId('verify-status-btn').click();
    await page.locator('input[name="username"]').waitFor();
    await login();
    await page.getByTestId('lost-response-card').waitFor();
    await page.getByTestId('retry-admission-btn').click();
    await page.getByTestId('admit-guest-btn').waitFor();
    assert.equal(await page.getByTestId('admitted-success-card').count(), 0, 'historical replay must not undo/display a reset as current admission');
    assert.equal((await Guest.findById(guest._id)).checkIn, null);
    assert.equal(writes.length, 2);
    assert.deepEqual(writes[1], writes[0], 'retry keeps exact original payload and UUID after reauth');
    // Logout must revoke the real server session, not just hide the workspace.
    const logoutResponse = page.waitForResponse(res => res.url().endsWith('/auth/logout'));
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    assert.equal((await logoutResponse).status(), 204);
    assert.equal((await context.request.get(`${origin}/api/checkin/v1/auth/session`)).status(), 401);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await closeBrowser();
    await close(front);
    await close(apiServer);
    if (nextProcess && nextProcess.exitCode === null) { const exit = once(nextProcess, 'exit'); nextProcess.kill(); await exit; }
    await stopReplSet();
  }
});

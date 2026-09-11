import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromiumExecutable } from '../../api/src/modules/exports/chromium.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = process.env.CHECKIN_EVIDENCE_DIR || path.resolve(__dirname, '../../../docs/evidence/hilton-guest-checkin');

const PORT = 3121;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const LIVE_EVENT = {
  id: 'ev-exp-01',
  name: 'Hilton Riyadh Demonstration (Demo)',
  venue: 'Grand Hall - Hilton Riyadh',
  startsAt: '2026-09-09T18:00:00+03:00',
  status: 'live',
  version: 1,
};

const CLOSED_EVENT = {
  id: 'ev-exp-02',
  name: 'Hilton Riyadh Closed Demo',
  venue: 'Grand Hall - Hilton Riyadh',
  startsAt: '2026-09-08T18:00:00+03:00',
  status: 'closed',
  version: 3,
};

function baseGuests() {
  return [
    {
      id: 'g-exp-1',
      eventId: 'ev-exp-01',
      name: 'Layla Haddad',
      reference: 'INV-101',
      shortCode: '7H8KJ92BCA',
      allowedCompanions: 2,
      companionNames: ['Sara Haddad'],
      totalAllowed: 3,
      version: 2,
      checkIn: {
        actualCompanions: 1,
        actualPartySize: 2,
        checkedInAt: '2026-09-09T16:00:00.000Z',
        checkedInBy: 'usr-admin',
        operatorName: 'demo_admin',
        method: 'manual',
      },
    },
    {
      id: 'g-exp-2',
      eventId: 'ev-exp-01',
      name: 'Omar Farouk',
      reference: 'INV-102',
      shortCode: '4M9PK21XYZ',
      allowedCompanions: 0,
      companionNames: [],
      totalAllowed: 1,
      version: 1,
      checkIn: null,
    },
    {
      id: 'g-exp-3',
      eventId: 'ev-exp-01',
      name: 'نورة العتيبي',
      reference: 'INV-103',
      shortCode: '8K2MN45TRW',
      allowedCompanions: 1,
      companionNames: [],
      totalAllowed: 2,
      version: 1,
      checkIn: null,
    },
  ];
}

function statsFor(guestsList) {
  const totalInvitations = guestsList.length;
  const admitted = guestsList.filter((g) => g.checkIn !== null);
  const totalAllowedCompanions = guestsList.reduce((a, g) => a + g.allowedCompanions, 0);
  const actualCompanions = admitted.reduce((a, g) => a + (g.checkIn.actualCompanions || 0), 0);
  return {
    totalInvitations,
    totalAllowedCompanions,
    expectedPeople: totalInvitations + totalAllowedCompanions,
    admittedInvitations: admitted.length,
    actualCompanions,
    actualAttendees: admitted.length + actualCompanions,
    pendingInvitations: totalInvitations - admitted.length,
    didNotAttendInvitations: totalInvitations - admitted.length,
    invitationAttendanceRate: 33.3,
    capacityAttendanceRate: 33.3,
    asOf: new Date().toISOString(),
  };
}

const SYNTHETIC_PDF = '%PDF-1.4\n%synthetic export for browser test\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';

describe('T10 — Export/report panel + admission correction Browser E2E', { timeout: 180000 }, () => {
  let nextProcess = null;
  let browser = null;

  before(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const webDir = path.resolve(__dirname, '..');
    nextProcess = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['next', 'start', '-p', String(PORT)],
      { cwd: webDir, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' }, detached: process.platform !== 'win32', shell: true, stdio: 'pipe' }
    );
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`${BASE_URL}/en/guests`);
        if (res.ok) { ready = true; break; }
      } catch { /* starting */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!ready) throw new Error(`Next.js server failed to start on port ${PORT}`);
    const executablePath = findChromiumExecutable();
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  });

  after(async () => {
    if (browser) await browser.close();
    if (nextProcess?.pid) {
      try {
        if (process.platform === 'win32') spawn('taskkill', ['/pid', String(nextProcess.pid), '/T', '/F']);
        else process.kill(-nextProcess.pid, 'SIGTERM');
      } catch { /* ignore */ }
    }
  });

  // Shared mock installer. Returns mutable state handles for assertions.
  async function setupAdminPage(page, { role = 'admin', events = [LIVE_EVENT, CLOSED_EVENT] } = {}) {
    const state = {
      guestsList: baseGuests(),
      jobs: new Map(),
      jobSeq: 0,
      nextOutcome: 'success', // success | fail | expired
      lastExportPayload: null,
      lastCorrection: null,
      lastReset: null,
      username: role === 'admin' ? 'demo_admin' : 'demo_reception_1',
      role,
    };

    await page.route('**/api/checkin/v1/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const p = url.pathname;
      const method = req.method();

      if (p === '/api/checkin/v1/auth/session') {
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ data: { user: { id: `usr-${state.username}`, username: state.username, displayName: state.username, role: state.role, assignedEventIds: ['ev-exp-01', 'ev-exp-02'] }, csrfToken: 'mock-csrf-t10', expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString() } }),
        });
      }
      if (p === '/api/checkin/v1/events' && method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: events }) });
      }
      const singleEventMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)$/);
      if (singleEventMatch && method === 'GET') {
        const ev = events.find((e) => e.id === singleEventMatch[1]) || LIVE_EVENT;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: ev }) });
      }
      const statsMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)\/stats$/);
      if (statsMatch && method === 'GET') {
        const evId = statsMatch[1];
        const list = evId === 'ev-exp-02' ? [] : state.guestsList;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: statsFor(list) }) });
      }
      const guestsMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)\/guests$/);
      if (guestsMatch && method === 'GET') {
        const evId = guestsMatch[1];
        const list = evId === 'ev-exp-02' ? [] : state.guestsList;
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ data: list, meta: { page: 1, pageSize: 25, total: list.length, totalPages: 1 } }),
        });
      }
      const qrMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)\/guests\/([^/]+)\/qr$/);
      if (qrMatch && method === 'GET') {
        const g = state.guestsList.find((x) => x.id === qrMatch[2]);
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ data: { shortCode: g?.shortCode || '7H8KJ92BCA', imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' } }),
        });
      }
      // Gate recent (for gate screenshots)
      if (p.endsWith('/gate/recent') && method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      }
      // Export create
      const exportCreateMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)\/exports$/);
      if (exportCreateMatch && method === 'POST') {
        const payload = JSON.parse(req.postData() || '{}');
        state.lastExportPayload = payload;
        state.jobSeq += 1;
        const id = `job-t10-${state.jobSeq}`;
        state.jobs.set(id, { polls: 0, outcome: state.nextOutcome, payload, snapshotAt: new Date().toISOString() });
        return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ data: { id, state: 'queued', snapshotAt: new Date().toISOString() } }) });
      }
      // Export download
      const dlMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)\/exports\/([^/]+)\/download$/);
      if (dlMatch && method === 'GET') {
        return route.fulfill({
          status: 200, contentType: 'application/pdf',
          headers: { 'content-disposition': 'attachment; filename="t10-export.pdf"', 'cache-control': 'no-store' },
          body: SYNTHETIC_PDF,
        });
      }
      // Export status poll
      const jobMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)\/exports\/([^/]+)$/);
      if (jobMatch && method === 'GET') {
        const job = state.jobs.get(jobMatch[2]);
        if (!job) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'not found' } }) });
        job.polls += 1;
        let st = 'queued';
        if (job.outcome === 'fail') st = job.polls >= 1 ? 'failed' : 'queued';
        else if (job.outcome === 'expired') st = job.polls >= 1 ? 'expired' : 'queued';
        else {
          if (job.polls === 1) st = 'queued';
          else if (job.polls === 2) st = 'running';
          else st = 'ready';
        }
        const body = { id: jobMatch[2], state: st, snapshotAt: job.snapshotAt, expiresAt: new Date(Date.now() + 86400000).toISOString() };
        if (st === 'failed') { body.errorCode = 'EXPORT_FAILED'; body.errorMessage = 'synthetic render failure'; }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: body }) });
      }
      // Correction PATCH
      const correctMatch = p.match(/^\/api\/checkin\/v1\/events\/([^/]+)\/guests\/([^/]+)\/checkin$/);
      if (correctMatch && method === 'PATCH') {
        if (state.role !== 'admin') {
          return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Permission denied' } }) });
        }
        const payload = JSON.parse(req.postData() || '{}');
        state.lastCorrection = payload;
        const g = state.guestsList.find((x) => x.id === correctMatch[2]);
        if (!g?.checkIn) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'not found' } }) });
        g.checkIn = { ...g.checkIn, actualCompanions: payload.actualCompanions, actualPartySize: 1 + payload.actualCompanions };
        g.version += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: g }) });
      }
      if (correctMatch && method === 'DELETE') {
        if (state.role !== 'admin') {
          return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Permission denied' } }) });
        }
        let payload = {};
        try { payload = JSON.parse(req.postData() || '{}'); } catch { payload = {}; }
        state.lastReset = payload;
        const g = state.guestsList.find((x) => x.id === correctMatch[2]);
        if (g) { g.checkIn = null; g.version += 1; }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: g }) });
      }
      return route.continue();
    });
    return state;
  }

  async function openExportPanel(page) {
    await page.click('[data-testid="export-qr-btn"]');
    await page.waitForSelector('[role="dialog"]');
  }

  it('single A6 pass export: create → poll → ready → download state', async () => {
    const page = await browser.newPage();
    const state = await setupAdminPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-exp-01`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="guest-row-g-exp-1"]');

    // Open single-guest flow via QR preview → Download PDF (A6)
    await page.click('[data-testid="view-qr-btn-g-exp-1"]');
    await page.waitForSelector('[data-testid="qr-container"]');
    await page.click('[data-testid="export-single-pdf-btn"]');

    // ExportPanel opens with single guest preselected
    await page.waitForSelector('[data-testid="export-single-pass"]');
    const singleScope = await page.locator('[data-testid="export-single-pass"]').textContent();
    assert.ok(singleScope.includes('Layla Haddad') || singleScope.toLowerCase().includes('single'), 'single option shows guest or Single scope');

    // Start single export, assert confirm shows 1 invitation
    await page.click('[data-testid="export-single-pass"]');
    await page.waitForSelector('[data-testid="export-confirm-btn"]');
    const confirmText = await page.textContent('body');
    assert.ok(confirmText.includes('1 invitation') || confirmText.includes('1 دعوة'), 'confirm dialog states 1 invitation for single pass');

    await page.click('[data-testid="export-confirm-btn"]');

    // Polling state appears, then ready + download
    await page.waitForSelector('[data-testid="export-download-btn"]', { timeout: 20000 });
    const readyText = await page.textContent('body');
    assert.ok(readyText.includes('Ready to download') || readyText.includes('جاهز'), 'ready state reached after polling');
    assert.ok(await page.locator('[data-testid="export-print-btn"]').isVisible(), 'print action visible when ready');
    assert.equal(state.lastExportPayload.kind, 'qr', 'single export posts kind=qr');
    assert.deepEqual(state.lastExportPayload.guestIds, ['g-exp-1'], 'single export posts exactly one guest id');

    // Download click surfaces no error
    await page.click('[data-testid="export-download-btn"]');
    await page.waitForTimeout(800);
    const afterDl = await page.textContent('body');
    assert.ok(!afterDl.includes('Download failed'), 'download click shows no failure');
    await page.close();
  });

  it('selected/all A4 scope counts + interim/final report wording + locale choice', async () => {
    const page = await browser.newPage();
    await setupAdminPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-exp-01`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="guest-row-g-exp-1"]');

    // Select two guests → scopeSelected must state invitation count
    await page.click('[data-testid="guest-checkbox-g-exp-2"]');
    await page.click('[data-testid="guest-checkbox-g-exp-3"]');
    await page.waitForSelector('[data-testid="selection-bar"]');
    await openExportPanel(page);
    const selectedScope = await page.locator('[data-testid="export-selected-passes"]').textContent();
    assert.ok(selectedScope.includes('2 invitation'), `selected scope states 2 invitations, got: ${selectedScope}`);
    const allScope = await page.locator('[data-testid="export-all-passes"]').textContent();
    assert.ok(allScope.includes('3 invitation'), `all scope states all 3 invitations (not page/filter), got: ${allScope}`);
    // Live event → interim wording
    const reportLive = await page.locator('[data-testid="export-report"]').textContent();
    assert.ok(reportLive.includes('Interim'), `live event report shows Interim, got: ${reportLive}`);
    // Locale selector offers ar/en and posts chosen locale
    const localeVal = await page.locator('#export-locale').inputValue();
    assert.ok(['ar', 'en'].includes(localeVal), 'locale selector present');
    await page.locator('#export-locale').selectOption('ar');
    assert.equal(await page.locator('#export-locale').inputValue(), 'ar');
    await page.locator('#export-locale').selectOption('en');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Closed event → final wording
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-exp-02`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await openExportPanel(page);
    const reportClosed = await page.locator('[data-testid="export-report"]').textContent();
    assert.ok(reportClosed.includes('Final'), `closed event report shows Final, got: ${reportClosed}`);
    await page.close();
  });

  it('failure / expired / retry states', async () => {
    const page = await browser.newPage();
    const state = await setupAdminPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-exp-01`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="guest-row-g-exp-1"]');
    await openExportPanel(page);

    // --- failed ---
    state.nextOutcome = 'fail';
    await page.click('[data-testid="export-all-passes"]');
    await page.waitForSelector('[data-testid="export-confirm-btn"]');
    await page.click('[data-testid="export-confirm-btn"]');
    await page.getByRole('button', { name: /Retry/ }).first().waitFor({ timeout: 10000 });
    const failBody = await page.textContent('body');
    assert.ok(failBody.includes('failed') || failBody.includes('Export failed'), 'failed state shows failure wording');
    const retryBtn = page.getByRole('button', { name: /Retry/ });
    assert.ok(await retryBtn.first().isVisible(), 'retry action visible after failure');
    // Retry re-opens same-type confirm
    await retryBtn.first().click();
    await page.waitForSelector('[data-testid="export-confirm-btn"]');
    // Succeed on retry
    state.nextOutcome = 'success';
    await page.click('[data-testid="export-confirm-btn"]');
    await page.waitForSelector('[data-testid="export-download-btn"]', { timeout: 20000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // --- expired ---
    await openExportPanel(page);
    await page.getByTestId('export-download-btn').waitFor();
    await page.getByTestId('export-new-btn').click();
    state.nextOutcome = 'expired';
    await page.click('[data-testid="export-all-passes"]');
    await page.waitForSelector('[data-testid="export-confirm-btn"]');
    await page.click('[data-testid="export-confirm-btn"]');
    await page.getByRole('button', { name: /Retry/ }).first().waitFor({ timeout: 10000 });
    const expBody = await page.textContent('body');
    assert.ok(expBody.includes('expired') || expBody.includes('Expired'), 'expired state shows expiry wording');
    assert.ok(await page.getByRole('button', { name: /Retry/ }).first().isVisible(), 'retry visible after expiry');
    await page.close();
  });

  it('admin correction (reason required, time/operator preserved) + reset dialog', async () => {
    const page = await browser.newPage();
    const state = await setupAdminPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-exp-01`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="correct-admission-btn-g-exp-1"]');

    const originalAt = state.guestsList[0].checkIn.checkedInAt;
    const originalOp = state.guestsList[0].checkIn.operatorName;

    // Correction requires reason: submit empty → validation error, dialog stays open
    await page.click('[data-testid="correct-admission-btn-g-exp-1"]');
    await page.waitForSelector('[data-testid="correction-submit-btn"]');
    await page.click('[data-testid="correction-submit-btn"]');
    await page.waitForTimeout(300);
    const alerts = await page.locator('[role="alert"]').count();
    assert.ok(alerts > 0, 'empty reason shows validation error');
    assert.ok(await page.locator('[data-testid="correction-submit-btn"]').isVisible(), 'dialog stays open on validation failure');

    // Fill reason + change companions 1→2, submit
    await page.fill('input[name="reason"]', 'Guest arrived with one extra companion, verified at door');
    await page.fill('input[name="actualCompanions"]', '2');
    await page.click('[data-testid="correction-submit-btn"]');
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('[data-testid="correction-submit-btn"]').count(), 0, 'correction dialog closes after success');
    assert.ok(state.lastCorrection.reason.length >= 5, 'correction posts reason');
    assert.equal(state.lastCorrection.actualCompanions, 2, 'correction posts new companion count');
    assert.equal(state.guestsList[0].checkIn.checkedInAt, originalAt, 'original check-in time preserved');
    assert.equal(state.guestsList[0].checkIn.operatorName, originalOp, 'original operator preserved');

    // Reset dialog: requires reason too, then clears check-in
    await page.waitForSelector('[data-testid="reset-admission-btn-g-exp-1"]');
    await page.click('[data-testid="reset-admission-btn-g-exp-1"]');
    await page.waitForSelector('[data-testid="reset-submit-btn"]');
    await page.click('[data-testid="reset-submit-btn"]');
    await page.waitForTimeout(300);
    assert.ok((await page.locator('[role="alert"]').count()) > 0, 'reset without reason shows validation error');
    await page.fill('input[name="reason"]', 'Duplicate scan — reset to allow deliberate re-admission');
    await page.click('[data-testid="reset-submit-btn"]');
    await page.waitForTimeout(1200);
    assert.equal(state.guestsList[0].checkIn, null, 'reset clears admission');
    assert.ok(state.lastReset.reason.length >= 5, 'reset posts reason');
    await page.close();
  });

  it('receptionist has no correction access (redirected to gate)', async () => {
    const page = await browser.newPage();
    await setupAdminPage(page, { role: 'reception' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-exp-01`, { waitUntil: 'networkidle' });
    await page.waitForURL('**/en/gate**', { timeout: 10000 });
    assert.ok(page.url().includes('/en/gate'), 'receptionist redirected from Guests to Gate');
    assert.equal(await page.locator('[data-testid^="correct-admission-btn-"]').count(), 0, 'no correction buttons for receptionist');
    assert.equal(await page.locator('[data-testid^="reset-admission-btn-"]').count(), 0, 'no reset buttons for receptionist');
    await page.close();
  });

  it('T10 demo-journey screenshots: guests + export panel + gate in EN/AR at 1440x900 and 390x844', async () => {
    const page = await browser.newPage();
    await setupAdminPage(page);

    async function shotGuestsExport(lang, w, h) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${BASE_URL}/${lang}/guests?eventId=ev-exp-01`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="guest-row-g-exp-1"]');
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `guests ${lang} ${w}x${h} must not overflow horizontally`);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `t10-guests-workspace-${lang}-${w}x${h}.png`), fullPage: false });
      await openExportPanel(page);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `t10-export-panel-${lang}-${w}x${h}.png`), fullPage: false });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    async function shotGate(lang, w, h) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${BASE_URL}/${lang}/gate?eventId=ev-exp-01`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="gate-event-header"]');
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `gate ${lang} ${w}x${h} must not overflow horizontally`);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `t10-gate-workspace-${lang}-${w}x${h}.png`), fullPage: false });
    }

    await shotGuestsExport('en', 1440, 900);
    await shotGuestsExport('ar', 1440, 900);
    await shotGuestsExport('en', 390, 844);
    await shotGuestsExport('ar', 390, 844);
    await shotGate('en', 1440, 900);
    await shotGate('ar', 1440, 900);
    await shotGate('en', 390, 844);
    await shotGate('ar', 390, 844);

    await page.close();
  });
});

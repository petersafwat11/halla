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

const PORT = 3109;
const BASE_URL = `http://127.0.0.1:${PORT}`;

describe('T07 — Browser E2E and Visual Responsive Verification', { timeout: 60000 }, () => {
  let nextProcess = null;
  let browser = null;

  before(async () => {
    // Ensure evidence dir exists
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }

    // Launch Next.js production server on disposable port
    const webDir = path.resolve(__dirname, '..');
    nextProcess = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['next', 'start', '-p', String(PORT)],
      {
        cwd: webDir,
        env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
        shell: true,
        stdio: 'pipe',
      }
    );

    // Wait for server to be ready
    let isReady = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`${BASE_URL}/ar/login`);
        if (res.ok) {
          isReady = true;
          break;
        }
      } catch {
        // Server still starting
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!isReady) {
      throw new Error(`Next.js server failed to start on port ${PORT}`);
    }

    // Launch Chromium via playwright-core
    const executablePath = findChromiumExecutable();
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (nextProcess && nextProcess.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(nextProcess.pid), '/T', '/F']);
        } else {
          nextProcess.kill('SIGTERM');
        }
      } catch {
        // Ignore termination error
      }
    }
  });

  it('renders login page in Arabic and English across desktop, tablet, and mobile viewports', async () => {
    const page = await browser.newPage();

    // 1. Arabic Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/ar/login`, { waitUntil: 'networkidle' });

    const dirAr = await page.evaluate(() => document.documentElement.dir || document.getElementById('app-lang-root')?.getAttribute('dir'));
    const langAr = await page.evaluate(() => document.documentElement.lang || document.getElementById('app-lang-root')?.getAttribute('lang'));
    assert.equal(dirAr, 'rtl');
    assert.equal(langAr, 'ar');

    // Verify title and buttons exist
    const titleAr = await page.textContent('h1');
    assert.ok(titleAr.includes('تسجيل الدخول'));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-login-ar-1440x900.png'),
      fullPage: false,
    });

    // 2. English Desktop (1440x900)
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
    const dirEn = await page.evaluate(() => document.documentElement.dir || document.getElementById('app-lang-root')?.getAttribute('dir'));
    const langEn = await page.evaluate(() => document.documentElement.lang || document.getElementById('app-lang-root')?.getAttribute('lang'));
    assert.equal(dirEn, 'ltr');
    assert.equal(langEn, 'en');

    const titleEn = await page.textContent('h1');
    assert.ok(titleEn.includes('Sign in'));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-login-en-1440x900.png'),
      fullPage: false,
    });

    // 3. Arabic Tablet (1024x768)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/ar/login`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-login-ar-1024x768.png'),
      fullPage: false,
    });

    // 4. Arabic Mobile 390x844 (iPhone)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/ar/login`, { waitUntil: 'networkidle' });

    // Verify no horizontal overflow
    const hasOverflow390 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasOverflow390, false, 'Page must not have horizontal overflow on 390px');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-login-ar-390x844.png'),
      fullPage: false,
    });

    // 5. Arabic Mobile 360x800 (Android)
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}/ar/login`, { waitUntil: 'networkidle' });

    const hasOverflow360 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasOverflow360, false, 'Page must not have horizontal overflow on 360px');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-login-ar-360x800.png'),
      fullPage: false,
    });

    await page.close();
  });

  it('renders authenticated admin shell with Guests and Gate navigation', async () => {
    const page = await browser.newPage();

    // Mock API routes for admin session (exact DTO: { user, csrfToken, expiresAt })
    await page.route('**/api/checkin/v1/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'usr-admin-01',
              username: 'admin',
              displayName: 'سارة الأحمد',
              role: 'admin',
              assignedEventIds: [],
            },
            csrfToken: 'mock-csrf-admin',
            expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          },
        }),
      });
    });

    await page.route('**/api/checkin/v1/events', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'ev-hilton-01',
              name: 'حفل فندق هيلتون الرياض السنوي',
              venue: 'قاعة الأندلس - فندق هيلتون الرياض',
              startsAt: '2026-09-08T18:00:00.000Z',
              status: 'live',
              version: 1,
            },
          ],
        }),
      });
    });

    // 1. Arabic Admin Workspace Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/ar/guests?eventId=ev-hilton-01`, { waitUntil: 'networkidle' });

    // Verify header components
    const staffName = await page.textContent('header');
    assert.ok(staffName.includes('سارة الأحمد'));
    assert.ok(staffName.includes('مشرف'));

    // Verify both Guests and Gate tabs appear
    const navText = await page.textContent('nav[aria-label="Workspaces"]');
    assert.ok(navText.includes('قائمة الضيوف'));
    assert.ok(navText.includes('بوابة الدخول'));

    // Verify active event name in header selector
    assert.ok(staffName.includes('حفل فندق هيلتون الرياض السنوي'));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-workspace-ar-1440x900.png'),
      fullPage: false,
    });

    // 2. English Admin Workspace Desktop (1440x900)
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-hilton-01`, { waitUntil: 'networkidle' });
    const headerEn = await page.textContent('header');
    assert.ok(headerEn.includes('Administrator'));
    const navTextEn = await page.textContent('nav[aria-label="Workspaces"]');
    assert.ok(navTextEn.includes('Guests'));
    assert.ok(navTextEn.includes('Gate'));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-workspace-en-1440x900.png'),
      fullPage: false,
    });

    // 3. Arabic Mobile Workspace (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/ar/guests?eventId=ev-hilton-01`, { waitUntil: 'networkidle' });

    const overflowMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(overflowMobile, false, 'Mobile workspace must not overflow horizontally');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-workspace-ar-390x844.png'),
      fullPage: false,
    });

    await page.close();
  });

  it('receptionist role cannot see Guests navigation and is redirected from /guests to /gate', async () => {
    const page = await browser.newPage();

    // Mock API routes for reception session (exact DTO: { user, csrfToken, expiresAt })
    await page.route('**/api/checkin/v1/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'usr-rec-01',
              username: 'reception',
              displayName: 'أحمد محمود',
              role: 'reception',
              assignedEventIds: ['ev-hilton-01'],
            },
            csrfToken: 'mock-csrf-rec',
            expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          },
        }),
      });
    });

    await page.route('**/api/checkin/v1/events', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'ev-hilton-01',
              name: 'حفل فندق هيلتون الرياض السنوي',
              venue: 'قاعة الأندلس - فندق هيلتون الرياض',
              startsAt: '2026-09-08T18:00:00.000Z',
              status: 'live',
              version: 1,
            },
          ],
        }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to /ar/guests as receptionist
    await page.goto(`${BASE_URL}/ar/guests?eventId=ev-hilton-01`, { waitUntil: 'networkidle' });

    // Expect automatic client redirect to /ar/gate
    await page.waitForURL('**/ar/gate**');
    assert.ok(page.url().includes('/ar/gate'), 'Receptionist must be redirected to Gate workspace');

    // Check that Guests tab is completely hidden from WorkspaceNav
    const navText = await page.textContent('nav[aria-label="Workspaces"]');
    assert.ok(!navText.includes('قائمة الضيوف'), 'Receptionist must NOT see Guests tab');
    assert.ok(navText.includes('بوابة الدخول'), 'Receptionist sees Gate tab');

    // Screenshot of Receptionist Gate view
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-reception-gate-ar.png'),
      fullPage: false,
    });

    await page.close();
  });

  it('language toggle switches locale while preserving active eventId', async () => {
    const page = await browser.newPage();

    await page.route('**/api/checkin/v1/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: { id: 'u1', username: 'admin', displayName: 'Admin', role: 'admin', assignedEventIds: [] },
            csrfToken: 'mock-csrf',
            expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          },
        }),
      });
    });

    await page.route('**/api/checkin/v1/events', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'ev-special-99', name: 'Special Event', venue: 'Venue', startsAt: '2026-09-08T18:00:00Z', status: 'live' }],
        }),
      });
    });

    await page.goto(`${BASE_URL}/ar/gate?eventId=ev-special-99`, { waitUntil: 'networkidle' });
    assert.ok(page.url().includes('/ar/gate'));

    // Click language switch link in header
    await page.click('header a[aria-label="التبديل إلى اللغة الإنجليزية"]');
    await page.waitForURL('**/en/gate**');

    // Verify redirected to /en/gate with preserved eventId
    assert.ok(page.url().includes('/en/gate'), 'Must switch to English');
    assert.ok(page.url().includes('eventId=ev-special-99'), 'Must preserve eventId query parameter');

    await page.close();
  });
});

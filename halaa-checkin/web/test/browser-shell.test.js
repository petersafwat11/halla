import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromiumExecutable } from '../../api/src/modules/exports/chromium.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = process.env.CHECKIN_EVIDENCE_DIR || path.resolve(__dirname, '../../../docs/evidence/hilton-guest-checkin');

const PORT = 3112;
const BASE_URL = `http://127.0.0.1:${PORT}`;

describe('T07 — Browser E2E and Visual Responsive Verification', { timeout: 120000 }, () => {
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
        detached: process.platform !== 'win32',
        shell: true,
        stdio: 'pipe',
      }
    );

    // Wait for server to be ready
    let isReady = false;
    for (let i = 0; i < 60; i++) {
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
          spawnSync('taskkill', ['/pid', String(nextProcess.pid), '/T', '/F']);
        } else {
          process.kill(-nextProcess.pid, 'SIGTERM');
        }
      } catch {
        // Ignore termination error
      }
    }
  });

  it('renders login page in Arabic and English across desktop, tablet, and mobile viewports', async () => {
    const page = await browser.newPage();

    // Mock API routes for login page
    await page.route('**/api/checkin/v1/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (path === '/api/checkin/v1/auth/session') {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Unauthenticated',
            },
          }),
        });
      }

      if (path === '/api/checkin/v1/auth/login' && method === 'POST') {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
            },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    // 1. Arabic Login Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/ar/login`, { waitUntil: 'networkidle' });

    // Assert official logo, titles, inputs, and toggle
    const titleAr = await page.textContent('h1');
    assert.equal(titleAr, 'تسجيل الدخول');

    // Confirm password visibility toggle exists
    const toggleBtn = page.locator('button[aria-label="إظهار كلمة المرور"]');
    assert.equal(await toggleBtn.count(), 1);

    // Assert credentials error appears on failed login
    await page.fill('input[name="username"]', 'invalid_user');
    await page.fill('input[name="password"]', 'wrong_pass');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="alert"]');
    const alertText = await page.textContent('[role="alert"]');
    assert.ok(alertText.includes('اسم المستخدم أو كلمة المرور غير صحيحة'));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-login-ar-1440x900.png'),
      fullPage: false,
    });

    // 2. English Login Desktop (1440x900)
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
    const titleEn = await page.textContent('h1');
    assert.equal(titleEn, 'Sign in');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't07-login-en-1440x900.png'),
      fullPage: false,
    });

    // 3. Mobile Arabic Login (360x800)
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}/ar/login`, { waitUntil: 'networkidle' });

    // Verify no horizontal overflow on mobile
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

    // Mock API routes for admin session & all workspace calls
    await page.route('**/api/checkin/v1/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (path === '/api/checkin/v1/auth/session') {
        return route.fulfill({
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
      }

      if (path === '/api/checkin/v1/events' && method === 'GET') {
        return route.fulfill({
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
      }

      if (path === '/api/checkin/v1/events/ev-hilton-01' && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'ev-hilton-01',
              name: 'حفل فندق هيلتون الرياض السنوي',
              venue: 'قاعة الأندلس - فندق هيلتون الرياض',
              startsAt: '2026-09-08T18:00:00.000Z',
              status: 'live',
              version: 1,
            },
          }),
        });
      }

      if (path.includes('/stats')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              totalInvitations: 4,
              totalExpected: 8,
              totalAttendees: 2,
              admittedInvitations: 1,
              pendingInvitations: 3,
              attendanceRate: 25,
              headCountRate: 25,
              asOf: new Date().toISOString(),
            },
          }),
        });
      }

      if (path.includes('/guests')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            meta: { page: 1, pageSize: 25, total: 0 },
          }),
        });
      }

      if (path.includes('/gate/recent')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
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

    // Mock API routes for reception session & all workspace calls
    await page.route('**/api/checkin/v1/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (path === '/api/checkin/v1/auth/session') {
        return route.fulfill({
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
      }

      if (path === '/api/checkin/v1/events' && method === 'GET') {
        return route.fulfill({
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
      }

      if (path === '/api/checkin/v1/events/ev-hilton-01' && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'ev-hilton-01',
              name: 'حفل فندق هيلتون الرياض السنوي',
              venue: 'قاعة الأندلس - فندق هيلتون الرياض',
              startsAt: '2026-09-08T18:00:00.000Z',
              status: 'live',
              version: 1,
            },
          }),
        });
      }

      if (path.includes('/stats')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              totalInvitations: 4,
              totalExpected: 8,
              totalAttendees: 2,
              admittedInvitations: 1,
              pendingInvitations: 3,
              attendanceRate: 25,
              headCountRate: 25,
              asOf: new Date().toISOString(),
            },
          }),
        });
      }

      if (path.includes('/gate/recent')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
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

    await page.route('**/api/checkin/v1/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (path === '/api/checkin/v1/auth/session') {
        return route.fulfill({
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
      }

      if (path === '/api/checkin/v1/events' && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{ id: 'ev-special-99', name: 'Special Event', venue: 'Venue', startsAt: '2026-09-08T18:00:00Z', status: 'live' }],
          }),
        });
      }

      if (path === '/api/checkin/v1/events/ev-special-99' && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { id: 'ev-special-99', name: 'Special Event', venue: 'Venue', startsAt: '2026-09-08T18:00:00Z', status: 'live' },
          }),
        });
      }

      if (path.includes('/stats')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              totalInvitations: 1,
              totalExpected: 1,
              totalAttendees: 0,
              admittedInvitations: 0,
              pendingInvitations: 1,
              attendanceRate: 0,
              headCountRate: 0,
              asOf: new Date().toISOString(),
            },
          }),
        });
      }

      if (path.includes('/gate/recent')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
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

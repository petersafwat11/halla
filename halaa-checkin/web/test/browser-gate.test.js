import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromiumExecutable } from '../../api/src/modules/exports/chromium.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = path.resolve(__dirname, '../../../docs/evidence/hilton-guest-checkin');

const PORT = 3110;
const BASE_URL = `http://127.0.0.1:${PORT}`;

describe('T09 — Gate Workspace & Scanner Lifecycle Browser E2E Verification', { timeout: 120000 }, () => {
  let nextProcess = null;
  let browser = null;

  before(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }

    // Launch Next.js production server on port 3109
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

    let isReady = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`${BASE_URL}/ar/gate`);
        if (res.ok) {
          isReady = true;
          break;
        }
      } catch {
        // Server starting
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!isReady) {
      throw new Error(`Next.js server failed to start on port ${PORT}`);
    }

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
        // Ignore
      }
    }
  });

  it('verifies complete Gate lifecycle: QR resolve without admission, concurrency gate, duplicate protection, lost response retry, invalid invitation isolation, and responsive layout', async () => {
    // Shared backend state for mock
    let currentEvent = {
      id: 'ev-gate-01',
      name: 'حفل فندق هيلتون الرياض السنوي',
      venue: 'قاعة الاحتفالات الكبرى - هيلتون الرياض',
      startsAt: '2026-09-08T18:00:00+03:00',
      status: 'live',
      version: 1,
    };

    let secondEvent = {
      id: 'ev-gate-02',
      name: 'مؤتمر الضيافة السعودي',
      venue: 'مركز الرياض الدولي',
      startsAt: '2026-09-09T09:00:00+03:00',
      status: 'live',
      version: 1,
    };

    let guests = [
      {
        id: 'g-gate-1',
        eventId: 'ev-gate-01',
        name: 'عبدالرحمن السديري',
        reference: 'INV-101',
        shortCode: '7H8KJ92BCA',
        token: 'HGC1.VALID_TOKEN_1',
        allowedCompanions: 2,
        companionNames: ['فهد السديري', 'سلطان السديري'],
        totalAllowed: 3,
        version: 1,
        checkIn: null,
      },
      {
        id: 'g-gate-2',
        eventId: 'ev-gate-01',
        name: 'مها الخالدي',
        reference: 'INV-102',
        shortCode: '4M9PK21XYZ',
        token: 'HGC1.VALID_TOKEN_2',
        allowedCompanions: 0,
        companionNames: [],
        totalAllowed: 1,
        version: 1,
        checkIn: null,
      },
    ];

    let recentAdmissionsList = [];
    let submittedIdempotencyKeys = [];
    let failNextSubmit = false;

    // Route interceptor setup for any page
    const setupRoutes = async (page, username = 'reception_1') => {
      await page.route('**/api/checkin/v1/**', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        const path = url.pathname;
        const method = req.method();

        // Session probe
        if (path === '/api/checkin/v1/auth/session') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                user: { id: `usr-${username}`, username, displayName: username, role: 'reception' },
                role: 'reception',
                csrfToken: 'mock-csrf-gate',
                assignedEventIds: ['ev-gate-01', 'ev-gate-02'],
              },
            }),
          });
        }

        // Events list
        if (path === '/api/checkin/v1/events' && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [currentEvent, secondEvent] }),
          });
        }

        // Single event
        if (path.startsWith('/api/checkin/v1/events/') && !path.includes('/gate') && !path.includes('/checkins') && method === 'GET') {
          const evId = path.split('/')[5];
          const ev = evId === secondEvent.id ? secondEvent : currentEvent;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: ev }),
          });
        }

        // Recent admissions
        if (path.endsWith('/gate/recent') && method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: recentAdmissionsList }),
          });
        }

        // Search gate
        if (path.endsWith('/gate/search') && method === 'GET') {
          const q = (url.searchParams.get('q') || '').toLowerCase();
          const matches = guests.filter(
            (g) =>
              g.name.toLowerCase().includes(q) ||
              (g.reference && g.reference.toLowerCase().includes(q)) ||
              g.shortCode.toLowerCase().includes(q)
          );
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: matches }),
          });
        }

        // Resolve gate
        if (path.endsWith('/gate/resolve') && method === 'POST') {
          const body = JSON.parse(req.postData() || '{}');
          let matched = null;

          if (body.token) {
            matched = guests.find((g) => g.token === body.token);
          } else if (body.guestId) {
            matched = guests.find((g) => g.id === body.guestId);
          }

          if (!matched) {
            return route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({
                error: {
                  code: 'INVALID_INVITATION',
                  message: 'Invitation not valid for this event',
                },
              }),
            });
          }

          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                guest: {
                  id: matched.id,
                  eventId: matched.eventId,
                  name: matched.name,
                  reference: matched.reference,
                  shortCode: matched.shortCode,
                  allowedCompanions: matched.allowedCompanions,
                  companionNames: matched.companionNames,
                  totalAllowed: matched.totalAllowed,
                  version: matched.version,
                  checkIn: matched.checkIn,
                },
                event: currentEvent,
                eventState: currentEvent.status,
              },
            }),
          });
        }

        // Check-in admission
        if (path.endsWith('/checkins') && method === 'POST') {
          const idempotencyKey = req.headers()['idempotency-key'];
          const body = JSON.parse(req.postData() || '{}');

          submittedIdempotencyKeys.push({ key: idempotencyKey, body });

          if (failNextSubmit) {
            failNextSubmit = false;
            return route.abort('failed'); // simulate network failure / lost response
          }

          const guest = guests.find((g) => g.id === body.guestId);
          if (!guest) {
            return route.fulfill({
              status: 404,
              contentType: 'application/json',
              body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Guest not found' } }),
            });
          }

          // Concurrency check: already admitted?
          if (guest.checkIn !== null) {
            return route.fulfill({
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({
                error: {
                  code: 'ALREADY_CHECKED_IN',
                  message: 'Invitation already admitted',
                  details: { checkIn: guest.checkIn },
                },
              }),
            });
          }

          // Commit admission atomically
          guest.checkIn = {
            actualCompanions: body.actualCompanions,
            actualPartySize: 1 + body.actualCompanions,
            checkedInAt: '2026-09-08T18:45:00+03:00',
            checkedInBy: `usr-${username}`,
            operatorName: username,
            method: body.method || 'camera',
          };
          guest.version += 1;

          recentAdmissionsList.unshift(guest);

          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ data: guest }),
          });
        }

        return route.continue();
      });
    };

    // -------------------------------------------------------------
    // Scenario 1: Initial Render & Desktop Arabic Gate View (1440x900)
    // -------------------------------------------------------------
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await setupRoutes(page1, 'reception_ahmed');

    await page1.setViewportSize({ width: 1440, height: 900 });
    await page1.goto(`${BASE_URL}/ar/gate?eventId=ev-gate-01`, { waitUntil: 'networkidle' });

    // Verify Event Header
    const eventNameText = await page1.textContent('[data-testid="gate-event-header"] h1');
    assert.ok(eventNameText.includes('حفل فندق هيلتون الرياض السنوي'));

    // Verify Initial Empty Preview Card
    assert.ok(await page1.locator('[data-testid="admission-empty-card"]').isVisible());

    // -------------------------------------------------------------
    // Scenario 2: QR Resolve without Admission
    // -------------------------------------------------------------
    // Input valid QR via barcode scanner input
    await page1.fill('[data-testid="scanner-barcode-input"]', 'HGC1.VALID_TOKEN_1');
    await page1.click('[data-testid="scanner-submit-btn"]');

    // Wait for Preview Card to appear
    await page1.waitForSelector('[data-testid="admission-card"]');

    // Confirm that GUEST DETAILS are rendered, but GUEST IS NOT ADMITTED YET
    const previewName = await page1.textContent('[data-testid="guest-preview-name"]');
    assert.equal(previewName.trim(), 'عبدالرحمن السديري');

    const totalAllowed = await page1.textContent('[data-testid="guest-preview-total-allowed"]');
    assert.equal(totalAllowed.trim(), '3');

    // Actual companions defaults to 0
    const initialCompanions = await page1.textContent('[data-testid="companions-stepper-value"]');
    assert.equal(initialCompanions.trim(), '0');

    // Helper says 1 person (lead guest)
    const admitBtnTextInitial = await page1.textContent('[data-testid="admit-guest-btn"]');
    assert.ok(admitBtnTextInitial.includes('شخص واحد') || admitBtnTextInitial.includes('1'));

    // Backend guest record checkIn is STILL null (not admitted!)
    assert.equal(guests[0].checkIn, null, 'Resolve must not write admission to database');

    // -------------------------------------------------------------
    // Scenario 3: Stepper Controls & Manual Companion Adjustment
    // -------------------------------------------------------------
    // Increment companions to 1
    await page1.click('[data-testid="companions-stepper-increment"]');
    const comp1 = await page1.textContent('[data-testid="companions-stepper-value"]');
    assert.equal(comp1.trim(), '1');

    const admitBtnText1 = await page1.textContent('[data-testid="admit-guest-btn"]');
    assert.ok(admitBtnText1.includes('2'), 'Button should say admit 2 people');

    // Increment again to max (2)
    await page1.click('[data-testid="companions-stepper-increment"]');
    const comp2 = await page1.textContent('[data-testid="companions-stepper-value"]');
    assert.equal(comp2.trim(), '2');

    // Increment again should be disabled (cannot exceed allowed companions: 2)
    const incBtn = page1.locator('[data-testid="companions-stepper-increment"]');
    assert.equal(await incBtn.isDisabled(), true);

    // Decrement back to 1
    await page1.click('[data-testid="companions-stepper-decrement"]');
    const compAfterDec = await page1.textContent('[data-testid="companions-stepper-value"]');
    assert.equal(compAfterDec.trim(), '1');

    // -------------------------------------------------------------
    // Scenario 4: Context 1 Confirms Admission
    // -------------------------------------------------------------
    await page1.click('[data-testid="admit-guest-btn"]');

    // Wait for Success Card
    await page1.waitForSelector('[data-testid="admitted-success-card"]');
    const successTitle = await page1.textContent('[data-testid="admitted-success-card"]');
    assert.ok(successTitle.includes('تم تسجيل الدخول بنجاح') || successTitle.includes('Confirmed'));

    // Recent admissions section should now list this guest
    const recentCard = page1.locator('[data-testid="recent-admission-card-g-gate-1"]');
    assert.ok(await recentCard.isVisible(), 'Recent admission should appear in list');

    // -------------------------------------------------------------
    // Scenario 5: Concurrency Gate / Context 2 Duplicate Protection
    // -------------------------------------------------------------
    // Open a second independent browser context representing Receptionist 2
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await setupRoutes(page2, 'reception_sara');

    await page2.goto(`${BASE_URL}/ar/gate?eventId=ev-gate-01`, { waitUntil: 'networkidle' });

    // Context 2 attempts to scan the same guest
    await page2.fill('[data-testid="scanner-barcode-input"]', 'HGC1.VALID_TOKEN_1');
    await page2.click('[data-testid="scanner-submit-btn"]');

    // Context 2 must immediately receive ALREADY_CHECKED_IN warning card
    await page2.waitForSelector('[data-testid="already-admitted-card"]');
    const warningText = await page2.textContent('[data-testid="already-admitted-card"]');
    assert.ok(warningText.includes('تم تسجيل الدخول مسبقاً') || warningText.includes('Already Checked In'));
    assert.ok(warningText.includes('reception_ahmed'), 'Warning must display original operator name');

    // Context 2 MUST NOT have any confirm admission button
    const confirmBtnCount = await page2.locator('[data-testid="admit-guest-btn"]').count();
    assert.equal(confirmBtnCount, 0, 'Already admitted guest must not display an admission confirm button');

    // Context 2 clicks "Scan Next Guest" to reset to idle
    await page2.click('[data-testid="scan-next-btn"]');
    assert.ok(await page2.locator('[data-testid="admission-empty-card"]').isVisible());
    await context2.close();

    // Context 1 also clicks "Scan Next Guest" to reset
    await page1.click('[data-testid="scan-next-btn"]');
    assert.ok(await page1.locator('[data-testid="admission-empty-card"]').isVisible());

    // -------------------------------------------------------------
    // Scenario 6: Invalid / Wrong-Event QR Handling (No details leaked)
    // -------------------------------------------------------------
    await page1.fill('[data-testid="scanner-barcode-input"]', 'HGC1.UNKNOWN_OR_FOREIGN_TOKEN');
    await page1.click('[data-testid="scanner-submit-btn"]');

    await page1.waitForSelector('[data-testid="invalid-invitation-card"]');
    const invalidCardText = await page1.textContent('[data-testid="invalid-invitation-card"]');
    assert.ok(
      invalidCardText.includes('دعوة غير صالحة') || invalidCardText.includes('Invalid Invitation')
    );

    // Ensure NO guest name, shortCode or reference leaked in DOM
    const hasGuestPreview = await page1.locator('[data-testid="guest-preview-name"]').count();
    assert.equal(hasGuestPreview, 0, 'Zero guest details must be leaked for invalid invitations');

    await page1.click('[data-testid="scan-next-btn"]');

    // -------------------------------------------------------------
    // Scenario 7: Manual Guest Lookup with 300ms Debounce
    // -------------------------------------------------------------
    await page1.fill('[data-testid="gate-manual-search-input"]', 'مها');
    await page1.waitForTimeout(400); // 300ms debounce wait

    const searchResultG2 = page1.locator('[data-testid="gate-search-result-g-gate-2"]');
    assert.ok(await searchResultG2.isVisible(), 'Manual search should find guest 2');

    // Select guest 2 from search results
    await searchResultG2.click();

    // Enters preview card
    await page1.waitForSelector('[data-testid="admission-card"]');
    const g2Name = await page1.textContent('[data-testid="guest-preview-name"]');
    assert.equal(g2Name.trim(), 'مها الخالدي');

    // -------------------------------------------------------------
    // Scenario 8: Lost Response & Idempotency Key Reuse
    // -------------------------------------------------------------
    failNextSubmit = true;
    const initialKeyCount = submittedIdempotencyKeys.length;

    await page1.click('[data-testid="admit-guest-btn"]');

    // Should enter lost response state
    await page1.waitForSelector('[data-testid="lost-response-card"]');
    const lostTitle = await page1.textContent('[data-testid="lost-response-card"]');
    assert.ok(lostTitle.includes('غير مؤكدة') || lostTitle.includes('Unconfirmed'));

    // Click "Retry admission"
    assert.ok(await page1.locator('[data-testid="retry-admission-btn"]').isVisible());
    await page1.click('[data-testid="retry-admission-btn"]');

    // Retry should succeed
    await page1.waitForSelector('[data-testid="admitted-success-card"]');

    // Verify that the retry sent the EXACT SAME idempotency key
    const firstSubmit = submittedIdempotencyKeys[initialKeyCount];
    const secondSubmit = submittedIdempotencyKeys[initialKeyCount + 1];
    assert.ok(firstSubmit && secondSubmit);
    assert.equal(
      firstSubmit.key,
      secondSubmit.key,
      'Retry admission must reuse the exact same idempotency key'
    );

    // -------------------------------------------------------------
    // Scenario 9: Camera Fallback (Permission Denied)
    // -------------------------------------------------------------
    // Attempting start camera in headless mode where mediaDevices is stubbed or denied
    await page1.click('[data-testid="toggle-camera-btn"]');
    await page1.waitForTimeout(300);

    // Whether permission is denied or device unavailable, warning appears and scanner/manual remain active
    const barcodeInputVisible = await page1.locator('[data-testid="scanner-barcode-input"]').isVisible();
    const manualSearchVisible = await page1.locator('[data-testid="gate-manual-search-input"]').isVisible();
    assert.equal(barcodeInputVisible, true, 'Barcode input must remain usable when camera is stopped/denied');
    assert.equal(manualSearchVisible, true, 'Manual search must remain usable when camera is stopped/denied');

    // -------------------------------------------------------------
    // Scenario 10: Event Switch Clears Pending Preview
    // -------------------------------------------------------------
    // Resolve G1 again (it will show already admitted)
    await page1.fill('[data-testid="scanner-barcode-input"]', 'HGC1.VALID_TOKEN_1');
    await page1.click('[data-testid="scanner-submit-btn"]');
    await page1.waitForSelector('[data-testid="already-admitted-card"]');

    // Switch event in URL / selector to second event
    await page1.goto(`${BASE_URL}/ar/gate?eventId=ev-gate-02`, { waitUntil: 'networkidle' });

    // Preview must be cleared back to empty card, NOT showing old guest
    assert.ok(
      await page1.locator('[data-testid="admission-empty-card"]').isVisible(),
      'Event switch must reset gate preview to idle and clear stale guest data'
    );

    // -------------------------------------------------------------
    // Scenario 11: Capture Evidence & Responsive Checks
    // -------------------------------------------------------------
    // 1. Arabic Desktop 1440x900
    await page1.setViewportSize({ width: 1440, height: 900 });
    await page1.goto(`${BASE_URL}/ar/gate?eventId=ev-gate-01`, { waitUntil: 'networkidle' });
    await page1.screenshot({
      path: path.join(EVIDENCE_DIR, 't09-gate-workspace-ar-1440x900.png'),
      fullPage: false,
    });

    // 2. English Desktop 1440x900
    await page1.goto(`${BASE_URL}/en/gate?eventId=ev-gate-01`, { waitUntil: 'networkidle' });
    await page1.screenshot({
      path: path.join(EVIDENCE_DIR, 't09-gate-workspace-en-1440x900.png'),
      fullPage: false,
    });

    // 3. Mobile Arabic 390x844
    await page1.setViewportSize({ width: 390, height: 844 });
    await page1.goto(`${BASE_URL}/ar/gate?eventId=ev-gate-01`, { waitUntil: 'networkidle' });

    const overflow390 = await page1.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(overflow390, false, 'Mobile Gate workspace must not overflow horizontally on 390px');

    await page1.screenshot({
      path: path.join(EVIDENCE_DIR, 't09-gate-workspace-ar-390x844.png'),
      fullPage: false,
    });

    // 4. Mobile Arabic 360x800
    await page1.setViewportSize({ width: 360, height: 800 });
    await page1.goto(`${BASE_URL}/ar/gate?eventId=ev-gate-01`, { waitUntil: 'networkidle' });

    const overflow360 = await page1.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(overflow360, false, 'Mobile Gate workspace must not overflow horizontally on 360px');

    await page1.screenshot({
      path: path.join(EVIDENCE_DIR, 't09-gate-workspace-ar-360x800.png'),
      fullPage: false,
    });

    await page1.close();
    await context1.close();
  });
});

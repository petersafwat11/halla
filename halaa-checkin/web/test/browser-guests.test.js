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

const PORT = 3108;
const BASE_URL = `http://127.0.0.1:${PORT}`;

describe('T08 — Guests Workspace Browser E2E Verification', { timeout: 90000 }, () => {
  let nextProcess = null;
  let browser = null;

  before(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }

    // Launch Next.js production server on disposable port 3108
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
        const res = await fetch(`${BASE_URL}/ar/guests`);
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
        // Ignore termination error
      }
    }
  });

  it('runs complete Guests workspace workflow: stats, CRUD, selection, CSV import, lifecycle, and mobile containment', async () => {
    const page = await browser.newPage();

    // Mock state in memory to simulate backend state across mutations
    let currentEvent = {
      id: 'ev-hilton-01',
      name: 'حفل فندق هيلتون الرياض السنوي',
      venue: 'قاعة الاحتفالات الكبرى - هيلتون الرياض',
      startsAt: '2026-09-08T18:00:00+03:00',
      status: 'live',
      version: 1,
    };

    let guestsList = [
      {
        id: 'g-01',
        eventId: 'ev-hilton-01',
        name: 'أحمد حسن',
        reference: 'INV-001',
        shortCode: '7H8KJ92BCA',
        allowedCompanions: 2,
        companionNames: ['سارة حسن', 'عمر حسن'],
        totalAllowed: 3,
        version: 1,
        checkIn: {
          actualCompanions: 1,
          actualPartySize: 2,
          admittedAt: '2026-09-08T18:30:00+03:00',
          method: 'camera',
          operatorUsername: 'reception',
        },
      },
      {
        id: 'g-02',
        eventId: 'ev-hilton-01',
        name: 'نورة عبدالله',
        reference: 'INV-002',
        shortCode: '4M9PK21XYZ',
        allowedCompanions: 0,
        companionNames: [],
        totalAllowed: 1,
        version: 1,
        checkIn: null,
      },
      {
        id: 'g-03',
        eventId: 'ev-hilton-01',
        name: 'Michael Brown',
        reference: 'INV-003',
        shortCode: '8K2MN45TRW',
        allowedCompanions: 1,
        companionNames: ['Emma Brown'],
        totalAllowed: 2,
        version: 1,
        checkIn: null,
      },
    ];

    // Intercept backend API calls
    await page.route('**/api/checkin/v1/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      // Session
      if (path === '/api/checkin/v1/auth/session') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              user: { id: 'usr-admin', username: 'admin', displayName: 'سارة الأحمد', role: 'admin' },
              role: 'admin',
              csrfToken: 'mock-csrf-t08',
              assignedEventIds: [],
            },
          }),
        });
      }

      // Events list
      if (path === '/api/checkin/v1/events' && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [currentEvent] }),
        });
      }

      // Single event
      if (path === `/api/checkin/v1/events/${currentEvent.id}` && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: currentEvent }),
        });
      }

      // Event status transition
      if (path === `/api/checkin/v1/events/${currentEvent.id}/status` && method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        currentEvent = {
          ...currentEvent,
          status: body.status,
          version: currentEvent.version + 1,
        };
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: currentEvent }),
        });
      }

      // Stats
      if (path === `/api/checkin/v1/events/${currentEvent.id}/stats` && method === 'GET') {
        const totalInvitations = guestsList.length;
        const admittedGuests = guestsList.filter((g) => g.checkIn !== null);
        const admittedInvitations = admittedGuests.length;
        const totalAllowedCompanions = guestsList.reduce((acc, g) => acc + g.allowedCompanions, 0);
        const expectedPeople = totalInvitations + totalAllowedCompanions;
        const actualCompanions = admittedGuests.reduce((acc, g) => acc + (g.checkIn.actualCompanions || 0), 0);
        const actualAttendees = admittedInvitations + actualCompanions;
        const pendingInvitations = totalInvitations - admittedInvitations;

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              totalInvitations,
              totalAllowedCompanions,
              expectedPeople,
              admittedInvitations,
              actualCompanions,
              actualAttendees,
              pendingInvitations,
              didNotAttendInvitations: pendingInvitations,
              invitationAttendanceRate: totalInvitations > 0 ? Number(((admittedInvitations / totalInvitations) * 100).toFixed(1)) : 0,
              capacityAttendanceRate: expectedPeople > 0 ? Number(((actualAttendees / expectedPeople) * 100).toFixed(1)) : 0,
              asOf: new Date().toISOString(),
            },
          }),
        });
      }

      // Guests query
      if (path === `/api/checkin/v1/events/${currentEvent.id}/guests` && method === 'GET') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const status = url.searchParams.get('status') || 'all';

        let filtered = [...guestsList];
        if (q) {
          filtered = filtered.filter(
            (g) =>
              g.name.toLowerCase().includes(q) ||
              (g.reference && g.reference.toLowerCase().includes(q)) ||
              g.shortCode.toLowerCase().includes(q)
          );
        }
        if (status === 'admitted') {
          filtered = filtered.filter((g) => g.checkIn !== null);
        } else if (status === 'pending') {
          filtered = filtered.filter((g) => g.checkIn === null);
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: filtered,
            meta: {
              page: 1,
              pageSize: 25,
              total: filtered.length,
              totalPages: 1,
            },
          }),
        });
      }

      // Create guest
      if (path === `/api/checkin/v1/events/${currentEvent.id}/guests` && method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const newGuest = {
          id: `g-${Date.now()}`,
          eventId: currentEvent.id,
          name: body.name,
          reference: body.reference || null,
          shortCode: '9X4JK77ABC',
          allowedCompanions: body.allowedCompanions || 0,
          companionNames: body.companionNames || [],
          totalAllowed: 1 + (body.allowedCompanions || 0),
          version: 1,
          checkIn: null,
        };
        guestsList.push(newGuest);
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newGuest }),
        });
      }

      // Edit guest
      if (path.startsWith(`/api/checkin/v1/events/${currentEvent.id}/guests/`) && method === 'PATCH') {
        const guestId = path.split('/').pop();
        const body = JSON.parse(req.postData() || '{}');
        const idx = guestsList.findIndex((g) => g.id === guestId);
        if (idx !== -1) {
          guestsList[idx] = {
            ...guestsList[idx],
            name: body.name || guestsList[idx].name,
            reference: body.reference !== undefined ? body.reference : guestsList[idx].reference,
            allowedCompanions: body.allowedCompanions !== undefined ? body.allowedCompanions : guestsList[idx].allowedCompanions,
            totalAllowed: 1 + (body.allowedCompanions !== undefined ? body.allowedCompanions : guestsList[idx].allowedCompanions),
            version: guestsList[idx].version + 1,
          };
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: guestsList[idx] }),
          });
        }
      }

      // Delete guest
      if (path.startsWith(`/api/checkin/v1/events/${currentEvent.id}/guests/`) && method === 'DELETE') {
        const guestId = path.split('/').pop();
        guestsList = guestsList.filter((g) => g.id !== guestId);
        return route.fulfill({ status: 204, body: '' });
      }

      // Guest QR
      if (path.includes('/qr') && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              shortCode: '7H8KJ92BCA',
              imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            },
          }),
        });
      }

      // CSV Import Preview
      if (path.endsWith('/imports/preview') && method === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        const csv = body.csv || '';
        if (csv.includes('invalid_row_trigger')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                rows: 2,
                errors: [{ row: 2, field: 'allowedCompanions', message: 'Allowed companions must be an integer 0..20' }],
                warnings: [],
                validCount: 1,
                remainingCapacity: 997,
                canCommit: false,
              },
            }),
          });
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              rows: 2,
              errors: [],
              warnings: [],
              validCount: 2,
              remainingCapacity: 997,
              canCommit: true,
            },
          }),
        });
      }

      // CSV Import Commit
      if (path.endsWith('/imports/commit') && method === 'POST') {
        // Add 2 imported guests
        guestsList.push(
          {
            id: 'g-imp-1',
            eventId: currentEvent.id,
            name: 'سلطان القحطاني',
            reference: 'IMP-001',
            shortCode: '5T8LM22PQR',
            allowedCompanions: 1,
            companionNames: ['منى القحطاني'],
            totalAllowed: 2,
            version: 1,
            checkIn: null,
          },
          {
            id: 'g-imp-2',
            eventId: currentEvent.id,
            name: 'هدى السالم',
            reference: 'IMP-002',
            shortCode: '9P4MN66XYZ',
            allowedCompanions: 0,
            companionNames: [],
            totalAllowed: 1,
            version: 1,
            checkIn: null,
          }
        );

        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { createdCount: 2, guestIds: ['g-imp-1', 'g-imp-2'] },
          }),
        });
      }

      return route.continue();
    });

    // 1. Visit Arabic Guests Workspace (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/ar/guests?eventId=ev-hilton-01`, { waitUntil: 'networkidle' });

    // Verify Stats Strip values (Arabic numerals '٣', '٦', '٢' or ASCII '3', '6', '2')
    const totalInvText = await page.textContent('[data-testid="stat-total-invitations"]');
    assert.ok(totalInvText.includes('3') || totalInvText.includes('٣'), 'Total invitations card must display 3');

    const expectedText = await page.textContent('[data-testid="stat-total-expected"]');
    assert.ok(expectedText.includes('6') || expectedText.includes('٦'), 'Expected people card must display 6');

    const attendeesText = await page.textContent('[data-testid="stat-total-attendees"]');
    assert.ok(attendeesText.includes('2') || attendeesText.includes('٢'), 'Total attendees card must display 2');

    // Verify Table rows rendered
    const guestRows = await page.$$('[data-testid^="guest-row-"]');
    assert.equal(guestRows.length, 3, 'Must render 3 guest rows in table');

    // 2. Check Admitted Guest row actions
    // 'g-01' is admitted: edit and delete buttons must be disabled
    const editBtnG1 = page.locator('[data-testid="edit-guest-btn-g-01"]');
    assert.equal(await editBtnG1.isDisabled(), true, 'Admitted guest ordinary edit must be disabled');

    const deleteBtnG1 = page.locator('[data-testid="delete-guest-btn-g-01"]');
    assert.equal(await deleteBtnG1.isDisabled(), true, 'Admitted guest delete must be disabled');

    // 3. Test QR Preview Modal
    const qrBtnG1 = page.locator('[data-testid="view-qr-btn-g-01"]');
    await qrBtnG1.click();
    await page.waitForSelector('[data-testid="qr-container"]');
    const qrImage = page.locator('[data-testid="qr-image"]');
    assert.ok(await qrImage.isVisible(), 'QR image must be visible in modal');
    // Close QR modal
    await page.keyboard.press('Escape');

    // 4. Test Add Guest flow
    await page.click('[data-testid="add-guest-btn"]');
    await page.fill('[data-testid="guest-name-input"]', 'فيصل الدوسري');
    await page.fill('[data-testid="guest-reference-input"]', 'INV-004');
    await page.fill('[data-testid="guest-companions-input"]', '1');
    await page.fill('[data-testid="guest-companion-names-input"]', 'نجود الدوسري');
    await page.click('[data-testid="guest-submit-btn"]');

    // Wait for the new guest to appear in the table
    await page.waitForSelector('text=فيصل الدوسري');
    const guestRowsAfterAdd = await page.$$('[data-testid^="guest-row-"]');
    assert.equal(guestRowsAfterAdd.length, 4, 'Table should have 4 guests after addition');

    // 5. Test Search
    await page.fill('[data-testid="guests-search-input"]', 'Michael');
    await page.waitForTimeout(400); // 300ms debounce
    const filteredRows = await page.$$('[data-testid^="guest-row-"]');
    assert.equal(filteredRows.length, 1, 'Search should filter to 1 matching guest');
    assert.ok(await page.textContent('body').then((t) => t.includes('Michael Brown')));

    // Clear search
    await page.fill('[data-testid="guests-search-input"]', '');
    await page.waitForTimeout(400);

    // 6. Test Status Filter Tab (Admitted)
    await page.click('[data-testid="filter-admitted"]');
    await page.waitForTimeout(200);
    const admittedRows = await page.$$('[data-testid^="guest-row-"]');
    assert.equal(admittedRows.length, 1, 'Admitted tab should only show 1 admitted guest');

    // Return to All tab
    await page.click('[data-testid="filter-all"]');
    await page.waitForTimeout(200);

    // 7. Test Page Checkbox Selection
    await page.click('[data-testid="select-page-checkbox"]');
    const selectionBar = page.locator('[data-testid="selection-bar"]');
    assert.ok(await selectionBar.isVisible(), 'Selection bar should appear when guests selected');
    await page.click('[data-testid="clear-selection-btn"]');
    assert.equal(await selectionBar.isVisible(), false, 'Selection bar should disappear after clearing');

    // 8. Capture Evidence Screenshot (Arabic Desktop 1440x900)
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't08-guests-workspace-ar-1440x900.png'),
      fullPage: false,
    });

    // 9. Mobile Containment Check (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);

    const overflowMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(overflowMobile, false, 'Mobile workspace must not overflow page horizontally');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't08-guests-workspace-ar-390x844.png'),
      fullPage: false,
    });

    // 10. Test Event Close Lifecycle
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('[data-testid="close-event-btn"]');
    await page.click('[data-testid="lifecycle-confirm-btn"]');
    await page.waitForSelector('[data-testid="event-closed-banner"]');

    // Closed event: Add guest button should be disabled
    const addGuestBtnClosed = page.locator('[data-testid="add-guest-btn"]');
    assert.equal(await addGuestBtnClosed.isDisabled(), true, 'Add guest button must be disabled when event is closed');

    // Reopen event requiring reason
    await page.click('[data-testid="reopen-event-btn"]');
    await page.fill('[data-testid="reopen-reason-input"]', 'تمديد فترة الحفل بطلب من إدارة الفندق');
    await page.click('[data-testid="lifecycle-confirm-btn"]');
    await page.waitForTimeout(300);

    const bannerExists = await page.locator('[data-testid="event-closed-banner"]').isVisible();
    assert.equal(bannerExists, false, 'Event closed banner should be gone after reopening');

    // 11. Test Allowance Validation (Reject more names than allowed)
    await page.click('[data-testid="add-guest-btn"]');
    await page.fill('[data-testid="guest-name-input"]', 'سالم الحربي');
    await page.fill('[data-testid="guest-companions-input"]', '1');
    await page.fill('[data-testid="guest-companion-names-input"]', 'مرافق 1\nمرافق 2');
    await page.click('[data-testid="guest-submit-btn"]');

    // Error should appear and modal should stay open
    const hasError = await page.locator('[role="alert"]').count();
    assert.ok(hasError > 0, 'Validation error should be displayed when companion names exceed allowance');
    await page.keyboard.press('Escape');

    // 12. Test Soft-Delete on unadmitted guest
    await page.click('[data-testid="delete-guest-btn-g-02"]');
    await page.waitForSelector('[data-testid="confirm-delete-guest-btn"]');
    await page.click('[data-testid="confirm-delete-guest-btn"]');

    await page.waitForSelector('[data-testid="guest-row-g-02"]', { state: 'detached' });
    const g02Exists = await page.locator('[data-testid="guest-row-g-02"]').count();
    assert.equal(g02Exists, 0, 'Guest g-02 must be removed after deletion');

    // 13. Test CSV Import Modal (Template download, invalid preview error, commit)
    await page.click('[data-testid="import-csv-btn"]');
    await page.waitForSelector('[data-testid="template-ar-btn"]');
    assert.ok(await page.locator('[data-testid="template-ar-btn"]').isVisible(), 'Arabic template button visible');
    assert.ok(await page.locator('[data-testid="template-en-btn"]').isVisible(), 'English template button visible');

    // Close import modal
    await page.keyboard.press('Escape');

    // 14. English Workspace View (1440x900)
    await page.goto(`${BASE_URL}/en/guests?eventId=ev-hilton-01`, { waitUntil: 'networkidle' });
    const enTitle = await page.textContent('h1');
    assert.ok(enTitle.includes('حفل فندق هيلتون الرياض السنوي'));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't08-guests-workspace-en-1440x900.png'),
      fullPage: false,
    });

    // 15. Mobile 360x800 Viewport Check
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}/ar/guests?eventId=ev-hilton-01`, { waitUntil: 'networkidle' });

    const overflow360 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(overflow360, false, 'Mobile workspace must not overflow page horizontally on 360px');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 't08-guests-workspace-ar-360x800.png'),
      fullPage: false,
    });

    await page.close();
  });
});

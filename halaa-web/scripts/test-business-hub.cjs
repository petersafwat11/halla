/* eslint-disable no-restricted-syntax */
// Run against a built local web server. Uses fabricated guest data only.
// BUSINESS_HUB_BASE_URL=http://localhost:3120 PLAYWRIGHT_MODULE=playwright node scripts/test-business-hub.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.BUSINESS_HUB_BASE_URL || 'http://localhost:3120';
const output = path.resolve(__dirname, '../../docs/evidence/business-guest-hub');

const realisticCoverSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="coverBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1612"/>
      <stop offset="45%" stop-color="#2d2117"/>
      <stop offset="100%" stop-color="#140f0c"/>
    </linearGradient>
    <linearGradient id="goldAcc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#c28e5c" stop-opacity="0.85"/>
      <stop offset="50%" stop-color="#e3cbb4" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#c28e5c" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="beamLight" x1="0%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#c28e5c" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="archGrid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(214, 179, 146, 0.05)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#coverBg)"/>
  <rect width="1600" height="900" fill="url(#archGrid)"/>
  <polygon points="120,900 520,200 920,900" fill="url(#beamLight)"/>
  <polygon points="680,900 1100,160 1520,900" fill="url(#beamLight)"/>
  <circle cx="1220" cy="270" r="320" fill="none" stroke="url(#goldAcc)" stroke-width="1.5" stroke-opacity="0.3"/>
  <circle cx="1220" cy="270" r="230" fill="none" stroke="url(#goldAcc)" stroke-width="1" stroke-opacity="0.2"/>
  <path d="M -50 670 Q 450 490 950 650 T 1650 530" fill="none" stroke="url(#goldAcc)" stroke-width="2" stroke-opacity="0.45"/>
  <path d="M -50 720 Q 550 540 1050 700 T 1650 600" fill="none" stroke="url(#goldAcc)" stroke-width="1.5" stroke-opacity="0.25"/>
  <rect x="0" y="850" width="1600" height="50" fill="#140f0c" fill-opacity="0.75"/>
</svg>`;

const realisticLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="10" fill="#241b14"/>
  <rect x="1" y="1" width="46" height="46" rx="9" fill="none" stroke="#6b4e33" stroke-width="1.5"/>
  <path d="M14 34L24 14L34 34" fill="none" stroke="#c28e5c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M18 27H30" stroke="#f5ece4" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="24" cy="21" r="2" fill="#e3cbb4"/>
</svg>`;

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  let assertions = 0;
  let verifiedContrastLogs = false;
  try {
    for (const [lang, layout] of [['en', 'desktop'], ['en', 'mobile'], ['ar', 'desktop'], ['ar', 'mobile']]) {
      for (const mode of ['reply_and_qr', 'reply_only', 'none']) {
        const page = await browser.newPage({ viewport: layout === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1100 } });
        let response = null, revision = 0, saved = {}, preview = false, uncertain = true, rejectNext = false, failRead = false, failAfterSave = false;
        const event = {
          title: lang === 'ar' ? 'ملتقى قادة الأعمال والابتكار ٢٠٢٦' : 'Business Leadership & Innovation Forum 2026',
          description: lang === 'ar' ? 'يسعدنا حضوركم ومشاركتكم في ملتقى يجمع نخبة من قادة الأعمال وصناع القرار لتبادل الرؤى وتطوير شراكات استراتيجية.' : 'An executive evening gathering business leaders, investors, and decision-makers to explore future economic frontiers.',
          deliveryMode: 'portal_link',
          invitationType: mode,
          allowsReply: mode !== 'none',
          includesQr: mode === 'reply_and_qr',
          canRespond: mode !== 'none',
          date: '2026-10-20',
          time: '18:30',
          location: { address: lang === 'ar' ? 'مركز الملك عبدالله المالي (KAFD)، الرياض' : 'King Abdullah Financial District (KAFD), Riyadh' },
          branding: { businessName: lang === 'ar' ? 'شركة الأفق للاستثمار' : 'Horizon Investment Group', logoUrl: '/qa-logo.svg' },
          actions: { startAt: '2026-10-20T15:30:00Z', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=24.7,46.6', calendarIcs: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n', googleCalendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE', ride: { url: 'https://m.uber.com/ul/', fallbackUrl: 'https://www.google.com/maps/dir/?api=1&destination=24.7,46.6' } }
        };
        const realisticMsg = lang === 'ar'
          ? 'نتشرف بالحضور والمشاركة في هذا الملتقى المتميز، ونتطلع إلى لقاء نخبة رواد الأعمال وتبادل الرؤى المستقبلية.'
          : 'Delighted to confirm attendance. Looking forward to engaging with industry leaders and exploring strategic partnerships.';
        const realisticDietary = lang === 'ar' ? 'لا توجد متطلبات خاصة' : 'No specific dietary restrictions';

        const payload = () => ({ preview, guest: { id: '507f1f77bcf86cd799439011', name: lang === 'ar' ? 'سارة' : 'Sarah', revision, rsvp: { response, ...saved } }, event, pass: !preview && event.canRespond && response === 'confirmed' && mode === 'reply_and_qr' ? { code: 'fabricated-test-entry-pass', guestsCount: 1 + (saved.plusOnes || 0) } : null });
        await page.route('**/qa-logo.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: realisticLogoSvg }));
        await page.route('**/qa-cover.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: realisticCoverSvg }));
        await page.route('**/api/v2/**', async route => {
          if (route.request().url().includes('/guests/')) {
            if (route.request().method() === 'GET' && failRead) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
            if (route.request().method() === 'POST') {
              if (rejectNext) { rejectNext = false; return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'RSVP_STATE_CHANGED' }) }); }
              const body = route.request().postDataJSON();
              assert.equal(body.revision, revision); assert.equal(mode === 'none', false);
              response = body.response; saved = { message: body.message, dietaryRestrictions: body.dietaryRestrictions, plusOnes: body.plusOnes }; revision++;
              if (failAfterSave) { failRead = true; failAfterSave = false; }
              if (uncertain) { uncertain = false; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Simulated lost response after saving" }) }); }
            }
            return route.fulfill({ contentType: 'application/json', headers: { 'cache-control': 'private, no-store' }, body: JSON.stringify({ status: 'success', data: payload() }) });
          }
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        });
        const document = await page.goto(`${base}/${lang}/business-invitation/qa-code`);
        await page.getByRole('heading', { name: event.title }).waitFor();
        assert.match(document.headers()['cache-control'], /no-store/); assertions++;
        assert.equal(document.headers()['referrer-policy'], 'no-referrer'); assertions++;
        assert.ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex')); assertions++;
        assert.ok(!(await page.title()).includes('Sarah')); assertions++;
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true); assertions++;
        assert.ok(await page.locator("main").evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16)); assertions++;
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(output, `${lang}-${mode}-${layout}.png`), fullPage: true });
        const calendar = page.locator('summary').first();
        await calendar.click();
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: lang === 'ar' ? 'تنزيل ملف التقويم' : 'Download calendar file' }).click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename(), 'event.ics'); assertions++;
        await calendar.focus(); await page.keyboard.press('Escape');
        assert.equal(await page.locator('details[open]').count(), 0); assertions++;
        const ride = page.locator('summary').last(); await ride.click();
        const menuBounds = await page.locator('details[open] > div').boundingBox();
        assert.ok(menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= page.viewportSize().width); assertions++;
        await page.keyboard.press('Escape');
        if (mode === 'none') { assert.equal(await page.locator('form').count(), 0); assertions++; }
        else {
          // Automated contrast & shared Button verification
          const contrastEvaluations = await page.evaluate(() => {
            function parseRgb(rgbStr) {
              const m = (rgbStr || '').match(/\d+/g);
              return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
            }
            function lum([r, g, b]) {
              const a = [r, g, b].map(v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
              });
              return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
            }
            function cr(c1, c2) {
              const l1 = lum(parseRgb(c1));
              const l2 = lum(parseRgb(c2));
              return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            }
            const confirmBtn = document.querySelector('button[type="submit"]');
            const confirmStyle = window.getComputedStyle(confirmBtn);
            const input = document.querySelector('#business-message');
            const inputStyle = window.getComputedStyle(input);
            return {
              confirmClasses: confirmBtn.className,
              confirmContrast: cr(confirmStyle.color, confirmStyle.backgroundColor),
              inputBorderContrast: cr(inputStyle.borderColor, inputStyle.backgroundColor)
            };
          });
          // Verify shared Button implementation and accessible contrast
          assert.ok(contrastEvaluations.confirmClasses.includes('button')); assertions++;
          assert.ok(contrastEvaluations.confirmClasses.includes('primary')); assertions++;
          assert.ok(contrastEvaluations.confirmContrast >= 7.0); assertions++; // WCAG AAA
          assert.ok(contrastEvaluations.inputBorderContrast >= 3.0); assertions++; // WCAG 1.4.11

          if (!verifiedContrastLogs) {
            console.log(`Verified contrast ratios: Confirm button = ${contrastEvaluations.confirmContrast.toFixed(2)}:1 (>= 7:1 AAA), Input border = ${contrastEvaluations.inputBorderContrast.toFixed(2)}:1 (>= 3:1 non-text)`);
            verifiedContrastLogs = true;
          }

          await page.locator('#business-message').fill(realisticMsg);
          await page.locator('#business-dietary').fill(realisticDietary);
          await page.locator('#business-plus').fill('2');
          await page.getByRole('button', { name: lang === 'ar' ? 'تأكيد الحضور' : 'Confirm', exact: true }).click();
          await page.getByRole('heading', { name: lang === 'ar' ? 'تم تأكيد حضورك' : 'Attendance confirmed' }).waitFor();
          assert.equal(await page.locator('svg[class*="passCode"]').count(), mode === 'reply_and_qr' ? 1 : 0); assertions++;

          if (mode === 'reply_and_qr') {
            // Verify guest count badge contrast
            const partyContrast = await page.locator('span[class*="party"]').evaluate(el => {
              const s = window.getComputedStyle(el);
              function parseRgb(rgbStr) {
                const m = (rgbStr || '').match(/\d+/g);
                return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
              }
              function lum([r, g, b]) {
                const a = [r, g, b].map(v => {
                  v /= 255;
                  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                });
                return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
              }
              const l1 = lum(parseRgb(s.color));
              const l2 = lum(parseRgb(s.backgroundColor));
              return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            });
            assert.ok(partyContrast >= 7.0); assertions++; // WCAG AAA >= 7:1

            await page.screenshot({ path: path.join(output, lang+'-pass-'+layout+'.png'), fullPage: true });
            if (layout === 'mobile') {
              await page.setViewportSize({ width: 320, height: 844 });
              assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true); assertions++;
              assert.ok(await page.locator('p[class*="outcomeMessage"]').evaluate(el => el.scrollWidth <= el.clientWidth + 1)); assertions++;
              await page.setViewportSize({ width: 390, height: 844 });
            }
          }
          await page.reload();
          await page.getByRole('button', { name: lang === 'ar' ? 'تغيير ردي' : 'Change my response' }).click();
          assert.equal(await page.locator('#business-dietary').inputValue(), realisticDietary); assertions++;
          await page.getByRole('button', { name: lang === 'ar' ? 'اعتذار' : 'Decline', exact: true }).click();
          await page.getByRole('heading', { name: lang === 'ar' ? 'تم حفظ اعتذارك عن الحضور' : 'Response saved: unable to attend' }).waitFor();
          assert.equal(await page.locator('svg[class*="passCode"]').count(), 0); assertions++;
          await page.getByRole('button', { name: lang === 'ar' ? 'تغيير ردي' : 'Change my response' }).click();
          assert.equal(await page.locator('#business-message').evaluate(el => el === document.activeElement), true); assertions++;
          assert.equal(await page.locator('#business-message').inputValue(), realisticMsg); assertions++;
          await page.locator('#business-message').fill('Keep this draft: TestingUnbrokenStringWrappingOnNarrowViewport1234567890abcdefghijklmnopqrstuvwxyz');
          rejectNext = true;
          await page.getByRole('button', { name: lang === 'ar' ? 'تأكيد الحضور' : 'Confirm', exact: true }).click();
          await page.getByRole('alert').waitFor();
          assert.equal(await page.locator('#business-message').inputValue(), 'Keep this draft: TestingUnbrokenStringWrappingOnNarrowViewport1234567890abcdefghijklmnopqrstuvwxyz'); assertions++;
          assert.equal(response, 'declined'); assertions++;
          failAfterSave = true;
          await page.getByRole('button', { name: lang === 'ar' ? 'تأكيد الحضور' : 'Confirm', exact: true }).click();
          await page.getByRole('heading', { name: lang === 'ar' ? 'تم تأكيد حضورك' : 'Attendance confirmed' }).waitFor();
          assert.equal(saved.message, 'Keep this draft: TestingUnbrokenStringWrappingOnNarrowViewport1234567890abcdefghijklmnopqrstuvwxyz'); assertions++;
          if (layout === 'mobile') {
            await page.setViewportSize({ width: 320, height: 844 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true); assertions++;
            await page.setViewportSize({ width: 390, height: 844 });
          }
          failRead = false;
        }
        event.canRespond = false;
        await page.reload();
        if (mode !== 'none') {
          await page.getByText(lang === 'ar' ? 'لم تعد هذه المناسبة تقبل الردود.' : 'This event is no longer accepting responses.').waitFor();
          assert.equal(await page.locator('form').count(), 0); assertions++;
        }
        preview = true;
        await page.reload();
        await page.getByText(lang === 'ar' ? 'معاينة الدعوة — الردود ورمز الدخول غير متاحين.' : 'Invitation preview — responses and entry passes are disabled.').waitFor();
        assert.equal(await page.locator('form').count(), 0); assertions++;
        await page.route('**/api/v2/guests/**', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Invitation not found' }) }));
        await page.reload();
        await page.getByRole('heading', { name: lang === 'ar' ? 'الدعوة غير متاحة' : 'Invitation unavailable' }).waitFor();
        assert.equal(await page.locator('form').count(), 0); assertions++;
        await page.close();
      }
    }
    console.log(`Business hub browser checks passed: ${assertions} assertions, 12 language/mode/layout scenarios.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

// Run against a built local web server. Uses fabricated guest data only.
// BUSINESS_HUB_BASE_URL=http://localhost:3120 PLAYWRIGHT_MODULE=playwright node scripts/test-business-hub.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.BUSINESS_HUB_BASE_URL || 'http://localhost:3120';
const output = path.resolve(__dirname, '../../docs/evidence/business-guest-hub');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  let assertions = 0;
  try {
    for (const [lang, layout] of [['en', 'desktop'], ['en', 'mobile'], ['ar', 'desktop'], ['ar', 'mobile']]) {
      for (const mode of ['reply_and_qr', 'reply_only', 'none']) {
        const page = await browser.newPage({ viewport: layout === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1100 } });
        let response = null, revision = 0, saved = {}, preview = false, uncertain = true;
        const event = { title: lang === 'ar' ? 'ملتقى الأعمال السنوي' : 'Business Leadership Forum', description: lang === 'ar' ? 'نتطلع إلى لقائكم في أمسية تجمع قادة الأعمال.' : 'An evening of conversations with business leaders. We look forward to welcoming you.', deliveryMode: 'portal_link', invitationType: mode, allowsReply: mode !== 'none', includesQr: mode === 'reply_and_qr', canRespond: mode !== 'none', date: '2026-10-20', time: '18:30', location: { address: lang === 'ar' ? 'مركز المؤتمرات، الرياض' : 'Conference Centre, Riyadh' }, branding: { businessName: lang === 'ar' ? 'أفق للأعمال' : 'Horizon Business', coverUrl: '/qa-cover.svg' }, actions: { startAt: '2026-10-20T15:30:00Z', directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=24.7,46.6', calendarIcs: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n', googleCalendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE', ride: { url: 'https://m.uber.com/ul/', fallbackUrl: 'https://www.google.com/maps/dir/?api=1&destination=24.7,46.6' } } };
        const payload = () => ({ preview, guest: { id: '507f1f77bcf86cd799439011', name: lang === 'ar' ? 'سارة' : 'Sarah', revision, rsvp: { response, ...saved } }, event, pass: response === 'confirmed' && mode === 'reply_and_qr' ? { code: 'fabricated-test-entry-pass', guestsCount: 1 + (saved.plusOnes || 0) } : null });
        await page.route('**/qa-cover.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#566e83"/><path d="M0 750L450 200L900 750L1350 100L1600 600V900H0Z" fill="#a3b7c4"/><path d="M0 850L600 450L1200 900" fill="#d7e0e5"/></svg>' }));
        await page.route('**/api/v2/**', async route => {
          if (route.request().url().includes('/guests/')) {
            if (route.request().method() === 'POST') {
              const body = route.request().postDataJSON();
              assert.equal(body.revision, revision); assert.equal(mode === 'none', false);
              response = body.response; saved = { message: body.message, dietaryRestrictions: body.dietaryRestrictions, plusOnes: body.plusOnes }; revision++;
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
        await page.screenshot({ path: path.join(output, `${lang}-${mode}-${layout}.png`), fullPage: true });
        if (mode === 'none') { assert.equal(await page.locator('form').count(), 0); assertions++; }
        else {
          await page.locator('#business-message').fill('Looking forward to it');
          await page.locator('#business-dietary').fill('No nuts');
          await page.locator('#business-plus').fill('2');
          await page.getByRole('button', { name: lang === 'ar' ? 'تأكيد الحضور' : 'Confirm', exact: true }).click();
          await page.getByRole('heading', { name: lang === 'ar' ? 'تم تأكيد حضورك' : 'Attendance confirmed' }).waitFor();
          assert.equal(await page.locator('svg').count(), mode === 'reply_and_qr' ? 1 : 0); assertions++;
          await page.reload();
          await page.getByRole('button', { name: lang === 'ar' ? 'تغيير ردي' : 'Change my response' }).click();
          assert.equal(await page.locator('#business-dietary').inputValue(), 'No nuts'); assertions++;
          await page.getByRole('button', { name: lang === 'ar' ? 'اعتذار' : 'Decline', exact: true }).click();
          await page.getByRole('heading', { name: lang === 'ar' ? 'تم حفظ اعتذارك عن الحضور' : 'Response saved: unable to attend' }).waitFor();
          assert.equal(await page.locator('svg').count(), 0); assertions++;
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

const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const { JSDOM } = require('jsdom');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://localhost:3100';

(async () => {
  const { formatNumber } = await import('@halaa/shared/utils/locale');
  const { data } = await (await fetch('http://localhost:8000/api/v2/plans/landing')).json();
  const price = p => p.pricing?.oneTime ?? p.price;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const lang of ['en', 'ar']) {
      const document = new JSDOM(await (await fetch(`${base}/${lang}`)).text()).window.document;
      const pricing = document.querySelector('#pricing');
      assert.equal(pricing.querySelectorAll('details').length, 0);
      assert.deepEqual(JSON.parse(pricing.querySelector('script').textContent)['@graph'][1].offers.map(o => o.price),
        [data.host.basic.event[0], data.host.premium.event[0]].map(price));
      assert.equal(document.querySelector('#reviews'), null);
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/${lang}`);
      const section = page.locator('#pricing');
      const check = async plans => {
        const expected = plans.map(price);
        await page.waitForFunction(expected => {
          const offers = JSON.parse(document.querySelector('#pricing script').textContent)['@graph'][1].offers;
          return JSON.stringify(offers.map(o => o.price)) === JSON.stringify(expected);
        }, expected);
        const visible = await section.locator('[class*="priceNum"], [class*="prHostPriceNum"]').allTextContents();
        assert.deepEqual(visible, expected.map(p => formatNumber(p, lang)));
        assert.equal(await section.locator('details').count(), 0);
        const fee = plans.find(p => p.setupFeeAmount > 0);
        if (fee) assert.ok((await section.innerText()).includes(formatNumber(fee.setupFeeAmount, lang)));
      };
      let checked = 0;
      for (const period of ['event', 'monthly']) {
        await section.getByRole('button', { name: lang === 'en' ? (period === 'event' ? 'Per Event' : 'Monthly') : (period === 'event' ? 'مناسبة واحدة' : 'شهري'), exact: true }).click();
        const basic = data.host.basic[period];
        for (let i = 0; i < basic.length; i++) {
          await section.locator('[class*="guestTrack"]').first().locator('button').nth(i).click();
          const count = period === 'event' ? basic[i].invites : basic[i].invitePool;
          const premium = data.host.premium[period].find(p => (period === 'event' ? p.invites : p.invitePool) === count);
          await check([basic[i], premium]);
          checked += 2;
        }
      }
      await section.getByRole('button', { name: lang === 'en' ? 'Business' : 'الأعمال', exact: true }).click();
      for (let i = 0; i < data.business.event.length; i++) {
        await section.locator('[class*="prGuestTrack"] button').nth(i).click();
        await check([data.business.event[i]]);
        checked++;
      }
      for (const period of ['quarterly', 'annual']) {
        await section.getByRole('button', { name: lang === 'en' ? (period === 'quarterly' ? '3-Month Pool' : 'Annual Pool') : (period === 'quarterly' ? 'اشتراك 3 أشهر' : 'اشتراك سنوي'), exact: true }).click();
        await check([data.business[period][0]]);
        checked++;
      }
      assert.deepEqual(errors, []);
      await page.close();
      if (process.env.COLD_BASE_URL) {
        const cold = new JSDOM(await (await fetch(`${process.env.COLD_BASE_URL}/${lang}`)).text()).window.document.querySelector('#pricing');
        assert.ok(cold.querySelector('a[href^="https://wa.me/"]'));
        assert.equal(cold.querySelectorAll('details').length, 0);
        assert.equal(JSON.parse(cold.querySelector('script').textContent)['@graph'][1].offers, undefined);
      }
      console.log(`${lang}: ${checked} card selections verified; initial HTML and changing schema match rendered prices; no duplicate list or page errors.`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

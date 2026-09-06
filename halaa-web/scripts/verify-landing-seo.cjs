const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

(async () => {
  const plans = await (await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:8000/api/v2'}/plans/landing`)).json();
  const expectedBasicPrice = plans.data.host.basic.event[0].pricing.oneTime;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const lang of ['en', 'ar']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const response = await page.goto(`http://localhost:3100/${lang}`);
      const raw = await response.text();
      assert.match(raw, /application\/ld\+json/);
      assert.doesNotMatch(raw, /rel="preload"[^>]+\/landing\/\d+\.png/);
      const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
      assert.equal(schema['@graph'][1].offers[0].price, expectedBasicPrice);
      assert.equal(schema['@graph'][2].mainEntity.length, 11);
      await page.locator('#home').screenshot({ path: path.join(os.tmpdir(), `halaa-landing-hero-${lang}.png`) });
      console.log(JSON.stringify({ lang, title: await page.title(), offers: schema['@graph'][1].offers.map(o=>o.price), schemaPresentInInitialHTML: true }));
      await page.goto(`http://localhost:3100/${lang}/privacy`);
      const title = await page.title();
      assert.equal((title.match(lang === 'en' ? /Halaa/g : /هلا/g) || []).length, 1);
      console.log(JSON.stringify({ lang, privacyTitle: title }));
      await context.close();
    }
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await mobile.newPage();
    const heroRequests = [];
    page.on('request', request => { if (/\/landing\/\d+\.(png|webp)/.test(request.url())) heroRequests.push(request.url()); });
    await page.goto('http://localhost:3100/en');
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    assert.equal(heroRequests.length, 0);
    console.log(JSON.stringify({ mobileHeroRequests: heroRequests.length }));
    await mobile.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

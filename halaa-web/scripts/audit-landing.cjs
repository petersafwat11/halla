// Production smoke/measurement runner. Output goes outside the working tree.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const lang of ['ar', 'en']) {
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        const response = await page.goto(`${process.env.BASE_URL || 'http://localhost:3100'}/${lang}`);
        const raw = await response.text();
        await page.waitForLoadState('networkidle');
        await page.keyboard.press('Tab');
        const firstFocus = await page.evaluate(() => document.activeElement?.textContent);
        if (await page.evaluate(() => document.activeElement?.getAttribute('href') === '#main-content')) await page.keyboard.press('Enter');
        const skipTarget = await page.evaluate(() => document.activeElement?.id);
        const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ url: r.name, type: r.initiatorType, bytes: r.encodedBodySize })));
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        const axe = await page.evaluate(async () => {
          const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
          return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
        });
        results.push({ lang, width, status: response.status(), htmlBytes: Buffer.byteLength(raw), scriptTags: (raw.match(/<script/g)||[]).length, firstFocus, skipTarget, errors, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), fonts: resources.filter(r=>/\.woff/.test(r.url)), jsBytes: resources.filter(r=>r.type==='script').reduce((n,r)=>n+r.bytes,0), axe });
        await page.screenshot({ path: path.join(os.tmpdir(), `halaa-seo-${process.env.AUDIT_LABEL || 'current'}-${lang}-${width}.png`), fullPage: true });
        await context.close();
      }
    }
  } finally { await browser.close(); }
  const output = path.join(os.tmpdir(), `halaa-seo-${process.env.AUDIT_LABEL || 'current'}.json`);
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(output);
  console.log(JSON.stringify(results.map(({axe,fonts,...r})=>({...r,fontRequests:fonts.length,fontBytes:fonts.reduce((n,f)=>n+f.bytes,0),violations:axe.map(v=>({id:v.id,nodes:v.nodes.length}))})),null,2));
})().catch(e => { console.error(e); process.exitCode = 1; });

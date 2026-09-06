import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import i18next from 'i18next';

const read = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const ar = read('../localization/locales/ar/landing.json');
const en = read('../localization/locales/en/landing.json');
const plans = read('../localization/locales/ar/plans.json');

test('landing copy has no fabricated reviews or unsupported audience/vendor counts', () => {
  for (const copy of [ar, en]) {
    assert.deepEqual(copy.testimonials.items, []);
    assert.equal(copy.testimonials.sub, '');
    assert.equal(copy.vendorCTA.stat1, undefined);
    assert.equal(copy.vendorCTA.stat2, undefined);
    assert.doesNotMatch(JSON.stringify(copy), /200\+|98%|thousands|hundreds|آلاف|مئات|no card required/i);
  }
});

test('FAQ follows five-step tour, preserves security FAQ, and states adjustable 48h reminders', () => {
  for (const copy of [ar, en]) assert.equal(copy.howItWorks.steps.length, 5);
  assert.match(ar.faq.items[0].a, /خمس خطوات/);
  assert.match(en.faq.items[0].a, /five clear steps/);
  for (const copy of [ar, en]) {
    for (const index of [0, 3]) assert.match(copy.faq.items[index].a, /48/);
    assert.match(copy.faq.items[0].a, /QR/);
  }
  assert.match(ar.faq.items[3].a, /تعديل/);
  assert.match(en.faq.items[3].a, /adjust/);
  assert.match(en.faq.items[8].q, /data safe/);
  assert.match(en.faq.items[9].q, /free/);
  assert.match(en.faq.items[9].a, /one event.*five guests.*90 days/);
  assert.match(ar.faq.items[9].a, /مناسبة واحدة.*خمسة ضيوف.*90/);
});

test('Arabic spelling and prelaunch app copy are consistent', () => {
  assert.equal(ar.header.signup, 'إنشاء حساب');
  assert.match(ar.features.items[1].description, /في الموعد المحدد/);
  assert.equal(ar.features.items[5].title, 'إدارة موظفي الاستقبال');
  assert.match(ar.features.items[5].description, /إضافة/);
  assert.match(ar.ctaBanner.sub, /^ابدأ.*المجاني.*بإرسال/);
  assert.match(ar.features.items[9].description, /القهوة/);
  assert.match(en.features.items[9].description, /coffee/);
  assert.match(ar.appDownload.description, /موقع هلا.*قريباً/);
  assert.match(en.appDownload.description, /website.*coming soon/);
  assert.doesNotMatch(JSON.stringify(ar), /انشاء|بأرسال|لارسال|فى |الإستقبال|المجانى/);
});

test('real i18next Arabic plural selection handles all six categories in both namespaces', async () => {
  const instance = i18next.createInstance();
  await instance.init({ lng: 'ar', fallbackLng: false, resources: { ar: { landing: ar, plans } } });
  const cases = [[0, 'لا توجد دعوات'], [1, 'دعوة تعويضية واحدة'], [2, 'دعوتان تعويضيتان'],
    [3, '3 دعوات تعويضية'], [11, '11 دعوة تعويضية'], [15, '15 دعوة تعويضية'], [100, '100 دعوة تعويضية']];
  for (const [count, expected] of cases) {
    for (const key of ['landing:pricing.compensationRow', 'plans:compensationRow']) {
      const result = instance.t(key, { count, percent: 15, base: 100 });
      assert.ok(result.startsWith(expected), `${key}: ${result}`);
      assert.doesNotMatch(result, /\{\{/);
    }
  }
});

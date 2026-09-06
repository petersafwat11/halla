import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { transform } from 'sucrase';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import i18next from 'i18next';
import * as data from '../ui/landing/landingPlansData.js';
import * as schema from '../ui/landing/landingSchema.js';
import * as brand from '@halaa/shared/brand';
import * as locale from '@halaa/shared/utils/locale';

test('actual pricing first-render handles unavailable, expired, empty, and partial catalogs without invented prices', async () => {
  const require = createRequire(import.meta.url);
  const i18n = i18next.createInstance();
  const resources = Object.fromEntries(['en', 'ar'].map(lang => [lang,
    Object.fromEntries(['landing', 'plans'].map(ns => [ns, JSON.parse(fs.readFileSync(new URL(`../localization/locales/${lang}/${ns}.json`, import.meta.url), 'utf8'))]))]));
  await i18n.init({ lng: 'en', resources });
  let query = {}, receivedOptions;
  const compile = path => {
    const code = transform(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { transforms: ['jsx', 'imports'], jsxRuntime: 'automatic', production: true }).code;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
    return module.exports.default;
  };
  const resolve = name => {
    if (name.endsWith('.css')) return {};
    if (name === 'react-i18next') return { useTranslation: ns => ({ t: i18n.getFixedT(i18n.language, ns) }) };
    if (name === '@/hooks/plans') return { useLandingPlans: options => { receivedOptions = options; return query; } };
    if (name === '../landingPlansData') return data;
    if (name === '../landingSchema') return schema;
    if (name === '@halaa/shared/brand') return brand;
    if (name === '@halaa/shared/utils/locale') return locale;
    if (name === '../_shared/useCarouselSnap') return () => ({ trackRef: React.useRef(null) });
    if (name.includes('PlanCard')) return ({ matchedPlan }) => React.createElement('div', { 'data-card': matchedPlan?.code }, matchedPlan?.pricing?.oneTime);
    if (name.includes('PlanDescription') || name.includes('SarIcon') || name.includes('CarouselDots')) return () => null;
    return require(name);
  };
  const Pricing = compile('../ui/landing/PricingSection/PricingSection.jsx');
  for (const lang of ['en', 'ar']) {
    await i18n.changeLanguage(lang);
    for (const value of [undefined, { data: { host: {}, business: {} }, fetchedAt: Date.now() },
      { data: { host: { basic: { event: [{ code: 'old', price: 95 }] } } }, fetchedAt: Date.now() - data.PLAN_MAX_AGE_MS - 1000 }]) {
      query = { data: value, isLoading: !value };
      const document = new JSDOM(renderToStaticMarkup(React.createElement(Pricing, { lang }))).window.document;
      assert.equal(document.querySelectorAll('details').length, 0);
      assert.ok(document.querySelector('a[href^="https://wa.me/"]'));
      assert.equal(document.querySelectorAll('[data-card]').length, 0);
      assert.equal(JSON.parse(document.querySelector('script').textContent)['@graph'][1].offers, undefined);
      assert.match(document.querySelector('[role="status"]').textContent, lang === 'en' ? /unavailable/ : /غير متاحة/);
    }
    const snapshot = { ...data.normalizeLandingPlans({ data: { host: { premium: { monthly: [{ code: 'monthly-only', pricing: { oneTime: 240 } }] } } } }), fetchedAt: Date.now() };
    query = { data: snapshot };
    const document = new JSDOM(renderToStaticMarkup(React.createElement(Pricing, { lang, initialPlans: snapshot }))).window.document;
    assert.equal(document.querySelectorAll('[data-card]').length, 1);
    assert.equal(document.querySelector('[data-card]').textContent, '240');
    assert.equal(JSON.parse(document.querySelector('script').textContent)['@graph'][1].offers[0].price, 240);
    assert.equal(receivedOptions.initialData, snapshot);
    assert.equal(receivedOptions.initialDataUpdatedAt, snapshot.fetchedAt);
    assert.equal(receivedOptions.refetchInterval, 300000);
    const full = { ...data.normalizeLandingPlans({ data: {
      host: { basic: { event: [{ code: 'basic', price: 95 }], monthly: [{ code: 'basic-monthly', price: 125 }] },
        premium: { event: [{ code: 'premium', price: 120 }] } },
      business: { event: [{ code: 'business', price: 100, setupFeeAmount: 1200 }] },
    } }), fetchedAt: Date.now() };
    query = { data: full };
    const initial = new JSDOM(renderToStaticMarkup(React.createElement(Pricing, { lang, initialPlans: full }))).window.document;
    assert.equal(initial.querySelectorAll('details').length, 0);
    assert.deepEqual([...initial.querySelectorAll('[data-card]')].map(e => e.dataset.card), ['basic', 'premium']);
    assert.deepEqual(JSON.parse(initial.querySelector('script').textContent)['@graph'][1].offers.map(o => o.price), [95, 120]);
    query = { data: { ...full, data: { host: {}, business: full.data.business } } };
    const business = new JSDOM(renderToStaticMarkup(React.createElement(Pricing, { lang }))).window.document;
    assert.ok(business.body.textContent.includes(locale.formatNumber(1200, lang)));
    assert.deepEqual(JSON.parse(business.querySelector('script').textContent)['@graph'][1].offers.map(o => o.price), [100]);
  }
});

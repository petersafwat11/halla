import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandingSchema, planOffers } from '../ui/landing/landingSchema.js';
import { safeJsonLd } from '@halaa/shared/brand';
import { landingPageProperties } from '../ui/landing/analyticsProperties.js';

test('analytics strips private URL paths and only accepts campaign slugs', () => {
  assert.deepEqual(landingPageProperties({ origin: 'https://halaa.com.sa', lang: 'en', referrer: 'https://example.com/private?email=someone@example.com', search: '?token=secret&utm_source=google&utm_medium=cpc&utm_campaign=summer_2026' }), {
    page_location: 'https://halaa.com.sa/en', page_referrer: 'https://example.com', campaign_source: 'google', campaign_medium: 'cpc', campaign_name: 'summer_2026',
  });
  assert.equal(landingPageProperties({ origin: 'https://halaa.com.sa', lang: 'ar', search: '?utm_source=someone@example.com' }).campaign_source, undefined);
});

test('offers preserve the displayed database price and omit unknown prices', () => {
  const offers = planOffers([
    { code: 'basic', name: { en: 'Basic' }, pricing: { oneTime: 95 }, price: 100, currency: 'SAR' },
    { code: 'missing' }, null, { code: 'bad', price: NaN }, { code: 'free', price: 0 },
  ], 'en');
  assert.equal(offers.length, 2);
  assert.equal(offers[0].price, 95);
  assert.equal(offers[1].price, 0);
  assert.equal(offers[0].priceCurrency, 'SAR');
});

test('schema uses visible FAQ text, contains no invented reviews, and safely serializes content', () => {
  const schema = buildLandingSchema({ lang: 'en', faq: [{ q: 'Question', a: '</script><script>alert(1)</script>' }] });
  const serialized = safeJsonLd(schema);
  assert.equal(serialized.includes('</script>'), false);
  const graph = JSON.parse(serialized)['@graph'];
  assert.equal(graph[2].mainEntity[0].acceptedAnswer.text, '</script><script>alert(1)</script>');
  assert.equal(graph[1].offers, undefined);
  assert.equal(graph[1].aggregateRating, undefined);
});

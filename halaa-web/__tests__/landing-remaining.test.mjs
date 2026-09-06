import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { publicNamespacesForPath } from '../localization/publicNamespaces.js';
import { planOffers } from '../ui/landing/landingSchema.js';
import sitemap from '../app/sitemap.js';
import { CANONICAL_ORIGIN, BRAND_ASSETS } from '@halaa/shared/brand';

test('public dictionaries are scoped; auth and dashboards retain full initial namespaces', () => {
  for (const p of ['/ar', '/en/', '/ar/market-place', '/en/market-place/vendors/123', '/en/privacy'])
    assert.deepEqual(publicNamespacesForPath(p), ['common', 'landing', 'plans', 'marketplace']);
  for (const p of [null, '/ar/host', '/en/admin-dash', '/ar/vendor-dashboard', '/en/login', '/ar/signup', '/en/invite/token'])
    assert.equal(publicNamespacesForPath(p), null);
});

test('each inspected gallery image has distinct localized alt text', () => {
  for (const lang of ['ar', 'en']) {
    const copy = JSON.parse(fs.readFileSync(new URL(`../localization/locales/${lang}/landing.json`, import.meta.url)));
    assert.equal(copy.invitations.imageAlts.length, 16);
    assert.equal(new Set(copy.invitations.imageAlts).size, 16);
    assert.ok(copy.invitations.imageAlts.every(a => a.length > 10));
    assert.ok(copy.header.openMenu && copy.header.closeMenu && copy.carousel.goTo);
  }
});

test('business offers disclose billing period and setup separately from the base price', () => {
  const plan = { code: 'business.annual', price: 900, billingType: 'annual', setupFeeAmount: 100 };
  const [en] = planOffers([plan], 'en');
  assert.equal(en.price, 900);
  assert.match(en.description, /Annual; Additional setup fee: 100 SAR/);
  assert.match(planOffers([plan], 'ar')[0].description, /سنوي.*100/);
});

test('legal pages carry absolute social images and do not inherit a second brand suffix', () => {
  // Node's test loader does not support the legacy legal manifest JSON import;
  // execute the real pure builder with the route map dependency supplied.
  const source = fs.readFileSync(new URL('../ui/landing/Legal/legalMetadata.js', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('const ORIGIN')).replace('export function', 'function');
  const buildLegalMetadata = new Function('LEGAL_ROUTES', 'CANONICAL_ORIGIN', 'BRAND_ASSETS', `${body}; return buildLegalMetadata;`)({ privacy: 'privacy' }, CANONICAL_ORIGIN, BRAND_ASSETS);
  const metadata = buildLegalMetadata({ documentType: 'privacy', lang: 'en', titleEn: 'Privacy Policy – Halaa', descEn: 'Privacy information' });
  assert.deepEqual(metadata.title, { absolute: 'Privacy Policy – Halaa' });
  assert.deepEqual(metadata.openGraph.images, ['https://halaa.com.sa/opengraph-image']);
  assert.deepEqual(metadata.twitter.images, metadata.openGraph.images);
});

test('runtime sitemap respects endpoint limit and collects later vendor pages', async () => {
  const previous = process.env.INTERNAL_API_URL;
  const fetchOriginal = globalThis.fetch;
  process.env.INTERNAL_API_URL = 'https://internal.test/api/v2/';
  const requested = [];
  globalThis.fetch = async url => {
    requested.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    assert.equal(new URL(url).searchParams.get('limit'), '100');
    return { ok: true, json: async () => ({ data: [{ id: `vendor-${page}` }], pagination: { pages: 2 } }) };
  };
  try {
    const entries = await sitemap();
    assert.equal(requested.length, 2);
    assert.equal(entries.filter(e => /vendors\/vendor-/.test(e.url)).length, 4);
    globalThis.fetch = async () => { throw new Error('unreachable'); };
    assert.ok((await sitemap()).some(e => e.url === 'https://halaa.com.sa/en'));
  } finally {
    globalThis.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.INTERNAL_API_URL;
    else process.env.INTERNAL_API_URL = previous;
  }
});

test('vendor card mapping cannot serialize private contacts or unsupported ratings', () => {
  const source = fs.readFileSync(new URL('../ui/landing/VendorSearchSection/getLandingVendors.js', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('export function mapVendorForCard'), source.indexOf('export async function getLandingVendors')).replace('export ', '');
  const map = new Function(`${body}; return mapVendorForCard;`)();
  const result = map({ id: 'v', brandName: 'Vendor', email: 'private@example.com', phone: 'secret', rating: 5, reviews: ['unverified'], startingPrice: { amount: 10, internalNote: 'private' } }, new Map(), 'en');
  assert.equal(result.brandName, 'Vendor');
  for (const key of ['email', 'phone', 'rating', 'reviews']) assert.equal(result[key], undefined);
  assert.deepEqual(result.startingPrice, { amount: 10, currency: 'SAR' });
});

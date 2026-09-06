import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transform } from 'sucrase';
import * as data from '../ui/landing/landingPlansData.js';
import { planOffers } from '../ui/landing/landingSchema.js';

const fixture = () => ({ data: { host: {
  basic: { event: [{ code: 'basic', nameEn: 'Basic', pricing: { oneTime: 95 }, price: 99 }] },
  premium: { monthly: [{ code: 'premium-monthly', price: 120 }] },
}, business: { annual: [{ code: 'business-annual', price: 900 }] } } });

test('one normalized snapshot supplies all pathways and matching offer prices', () => {
  const result = data.normalizeLandingPlans(fixture());
  const available = [result.data.host.basic.event[0], result.data.host.premium.monthly[0], result.data.business.annual[0]];
  assert.deepEqual(planOffers(available, 'en').map(o => o.price), [95, 120, 900]);
  assert.deepEqual(result.data.host.basic.monthly, []);
});

test('bad catalogs are rejected rather than converted to free plans', () => {
  assert.equal(data.normalizeLandingPlans({ data: {} }), null);
  for (const price of [undefined, null, NaN, -1, '95']) {
    assert.throws(() => data.normalizeLandingPlans({ data: { business: { event: [{ code: 'bad', price }] } } }));
  }
  assert.throws(() => data.normalizeLandingPlans({ data: { host: { basic: { event: {} } } } }));
  assert.equal(data.planPrice({ price: 0 }), 0);
});

test('last-known snapshots expire after one hour, including malformed timestamps', () => {
  assert.equal(data.usablePlanSnapshot({ fetchedAt: 100 }, 100 + data.PLAN_MAX_AGE_MS), true);
  assert.equal(data.usablePlanSnapshot({ fetchedAt: 100 }, 101 + data.PLAN_MAX_AGE_MS), false);
  assert.equal(data.usablePlanSnapshot({ fetchedAt: 200 }, 100), false);
  assert.equal(data.usablePlanSnapshot({}), false);
});

test('server loader has bounded fetches, validates before caching, and fails honestly', async () => {
  const source = fs.readFileSync(new URL('../ui/landing/getLandingPlans.js', import.meta.url), 'utf8');
  const code = transform(source, { transforms: ['imports'] }).code;
  let callback, options, fetchOptions, response = { ok: true, json: async () => fixture() };
  let cached;
  const compiledModule = { exports: {} };
  const resolver = specifier => {
    if (specifier === 'server-only') return {};
    if (specifier === './landingPlansData') return data;
    if (specifier === 'next/cache') return { unstable_cache: (fn, keys, config) => {
      callback = fn; options = config;
      return async base => cached ?? fn(base);
    } };
    throw new Error(specifier);
  };
  const fetchMock = async (url, opts) => { fetchOptions = opts; assert.equal(url, 'http://internal/api/v2/plans/landing'); return response; };
  new Function('require', 'module', 'exports', 'fetch', 'process', code)(resolver, compiledModule, compiledModule.exports, fetchMock,
    { env: { INTERNAL_API_URL: 'http://internal/api/v2/' } });
  const result = await compiledModule.exports.getLandingPlans();
  assert.equal(result.data.host.basic.event[0].pricing.oneTime, 95);
  assert.equal(options.revalidate, 300);
  assert.equal(fetchOptions.cache, 'no-store');
  assert.ok(fetchOptions.signal instanceof AbortSignal);
  response = { ok: false };
  await assert.rejects(callback('http://internal/api/v2'));
  assert.equal(await compiledModule.exports.getLandingPlans(), null);
  cached = result;
  assert.deepEqual(await compiledModule.exports.getLandingPlans(), result);
  cached = { ...result, fetchedAt: Date.now() - data.PLAN_MAX_AGE_MS - 1 };
  assert.equal(await compiledModule.exports.getLandingPlans(), null);
  cached = undefined;
  response = { ok: true, json: async () => ({ data: {} }) };
  assert.equal(await compiledModule.exports.getLandingPlans(), null);
  response = { ok: true, json: async () => { throw new SyntaxError('bad JSON'); } };
  assert.equal(await compiledModule.exports.getLandingPlans(), null);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const maps = require('../src/modules/locations/azureMaps.service');
const originalFetch = global.fetch;
const originalKey = config.maps.azureApiKey;
test.beforeEach(() => { config.maps.azureApiKey = 'azure-test-secret'; });
test.afterEach(() => { global.fetch = originalFetch; config.maps.azureApiKey = originalKey; });

test('Saudi POI suggestions include a complete location without exposing credentials', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url.hostname, 'atlas.microsoft.com');
    assert.equal(url.searchParams.get('countrySet'), 'SA');
    assert.equal(url.searchParams.get('language'), 'ar-SA');
    assert.equal(url.searchParams.get('lat'), '24.7');
    assert.equal(options.headers['subscription-key'], 'azure-test-secret');
    assert.equal(url.searchParams.has('subscription-key'), false);
    return { ok: true, json: async () => ({ results: [
      { id: 'venue-1', poi: { name: 'Venue' }, address: { freeformAddress: 'Riyadh, SA', municipality: 'Riyadh', country: 'Saudi Arabia' }, position: { lat: 24.7, lon: 46.6 } },
      { id: 'invalid', position: {} },
    ] }) };
  };
  const result = await maps.autocomplete({ q: 'Venue', latitude: 24.7, longitude: 46.6 });
  assert.equal(result.predictions.length, 1);
  assert.deepEqual(result.predictions[0].location, { address: 'Venue, Riyadh, SA', latitude: 24.7, longitude: 46.6, city: 'Riyadh', country: 'Saudi Arabia', placeId: 'venue-1', provider: 'azure' });
  assert.doesNotMatch(JSON.stringify(result), /azure-test-secret/);
});
test('reverse lookup preserves the pin rather than snapping it to the road', async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ addresses: [{ address: { freeformAddress: 'Street' }, position: '24.71,46.61' }] }) });
  const { location } = await maps.reverseGeocode({ latitude: 24.700001, longitude: 46.600001 });
  assert.equal(location.latitude, 24.700001);
  assert.equal(location.longitude, 46.600001);
  assert.equal(location.provider, 'azure');
});
test('missing key, malformed response, provider rejection and empty results fail safely', async () => {
  config.maps.azureApiKey = '';
  await assert.rejects(maps.autocomplete({ q: 'Venue' }), { code: 'MAPS_NOT_CONFIGURED' });
  config.maps.azureApiKey = 'azure-test-secret';
  global.fetch = async () => ({ ok: false, json: async () => ({ error: 'azure-test-secret' }) });
  await assert.rejects(maps.autocomplete({ q: 'Venue' }), error => error.code === 'MAPS_UNAVAILABLE' && !JSON.stringify(error).includes('azure-test-secret'));
  global.fetch = async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } });
  await assert.rejects(maps.autocomplete({ q: 'Venue' }), { code: 'MAPS_UNAVAILABLE' });
  global.fetch = async () => ({ ok: true, json: async () => ({ addresses: [] }) });
  await assert.rejects(maps.reverseGeocode({ latitude: 24, longitude: 46 }), { code: 'MAPS_ADDRESS_NOT_FOUND' });
});

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config');
const maps = require('../src/modules/locations/googleMaps.service');

const originalFetch = global.fetch;
const originalKey = config.maps?.serverApiKey;

test.beforeEach(() => {
  config.maps.serverApiKey = 'server-test-key';
});

test.afterEach(() => {
  global.fetch = originalFetch;
  config.maps.serverApiKey = originalKey;
});

test('normalizes Places New fields into the persisted event location contract', () => {
  assert.deepEqual(
    maps.normalizePlace({
      id: 'place-1',
      formattedAddress: 'شارع التحلية، الرياض، السعودية',
      location: { latitude: 24.7, longitude: 46.67 },
      addressComponents: [
        { longText: 'الرياض', types: ['locality'] },
        { longText: 'المملكة العربية السعودية', types: ['country'] },
      ],
    }),
    {
      address: 'شارع التحلية، الرياض، السعودية',
      latitude: 24.7,
      longitude: 46.67,
      city: 'الرياض',
      country: 'المملكة العربية السعودية',
      placeId: 'place-1',
      provider: 'google',
    }
  );
});

test('autocomplete keeps the server key out of the response and returns stable place ids', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({
        suggestions: [
          {
            placePrediction: {
              placeId: 'abc123',
              text: { text: 'Riyadh Front' },
              structuredFormat: {
                mainText: { text: 'Riyadh Front' },
                secondaryText: { text: 'Riyadh, Saudi Arabia' },
              },
            },
          },
        ],
      }),
    };
  };

  const result = await maps.autocomplete({
    q: 'Riyadh Front',
    language: 'en',
    sessionToken: 'session-123',
    latitude: 24.7,
    longitude: 46.67,
  });

  assert.equal(request.options.headers['X-Goog-Api-Key'], 'server-test-key');
  assert.equal(JSON.parse(request.options.body).includedRegionCodes[0], 'SA');
  assert.deepEqual(result, {
    predictions: [
      {
        placeId: 'abc123',
        description: 'Riyadh Front',
        mainText: 'Riyadh Front',
        secondaryText: 'Riyadh, Saudi Arabia',
      },
    ],
  });
  assert.doesNotMatch(JSON.stringify(result), /server-test-key/);
});

test('missing server configuration is a typed operational failure', async () => {
  config.maps.serverApiKey = '';
  await assert.rejects(
    () => maps.autocomplete({ q: 'Riyadh' }),
    (error) => error.code === 'MAPS_NOT_CONFIGURED' && error.statusCode === 503
  );
});

/** Azure location lookup. The subscription key never leaves the backend. */
const config = require('../../config');
const { AppError } = require('../../shared/errors');

const failure = (message, code = 'MAPS_UNAVAILABLE', status = 503) =>
  new AppError(message, status, code);

async function request(path, parameters) {
  const key = config.maps.azureApiKey;
  if (!key) throw failure('Location search is temporarily unavailable.', 'MAPS_NOT_CONFIGURED');
  const url = new URL(path, 'https://atlas.microsoft.com');
  url.search = new URLSearchParams({ 'api-version': '1.0', ...parameters });
  let response;
  let body;
  try {
    response = await fetch(url, {
      headers: { 'subscription-key': key },
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    });
    body = await response.json();
  } catch {
    throw failure('Location provider could not be reached.');
  }
  // Never forward provider diagnostics: they may contain request credentials.
  if (!response.ok) throw failure('Location provider rejected the request.');
  return body;
}

function normalizePlace(item) {
  const address = item.address || {};
  return {
    address: [item.poi?.name, address.freeformAddress].filter(value => typeof value === 'string').join(', ').slice(0, 500),
    latitude: item.position?.lat ?? null,
    longitude: item.position?.lon ?? null,
    city: String(address.municipality || address.countrySecondarySubdivision || '').slice(0, 100),
    country: String(address.country || '').slice(0, 100),
    placeId: typeof item.id === 'string' ? item.id.slice(0, 300) : null,
    provider: 'azure',
  };
}

async function autocomplete({ q, language = 'ar', latitude, longitude }) {
  const params = { query: q, countrySet: 'SA', language: language === 'ar' ? 'ar-SA' : 'en-US', typeahead: 'true', limit: '5' };
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.lat = String(latitude);
    params.lon = String(longitude);
  }
  const body = await request('/search/fuzzy/json', params);
  if (!Array.isArray(body?.results)) throw failure('Location provider returned an invalid response.');
  return { predictions: body.results
    .filter(item => item && Number.isFinite(item.position?.lat) && Math.abs(item.position.lat) <= 90
      && Number.isFinite(item.position?.lon) && Math.abs(item.position.lon) <= 180
      && (item.poi?.name || item.address?.freeformAddress))
    .slice(0, 5).map(item => {
      const location = normalizePlace(item);
      return { placeId: location.placeId, description: location.address,
        mainText: item.poi?.name || item.address?.freeformAddress || '',
        secondaryText: item.poi?.name ? item.address?.freeformAddress || '' : '', location };
    }) };
}

async function reverseGeocode({ latitude, longitude, language = 'ar' }) {
  const body = await request('/search/address/reverse/json', {
    query: `${latitude},${longitude}`, language: language === 'ar' ? 'ar-SA' : 'en-US',
  });
  if (!Array.isArray(body?.addresses)) throw failure('Location provider returned an invalid response.');
  const item = body.addresses?.[0];
  if (!item?.address?.freeformAddress) throw failure('No address was found for this point.', 'MAPS_ADDRESS_NOT_FOUND', 404);
  // Reverse-geocoding often snaps to a street. Keep the user's exact venue pin.
  return { location: { ...normalizePlace(item), latitude, longitude } };
}

module.exports = { autocomplete, reverseGeocode, normalizePlace };

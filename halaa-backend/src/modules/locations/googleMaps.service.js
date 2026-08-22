/**
 * Server-side Google Maps web-service adapter.
 *
 * Native clients must never contain an unrestricted Places/Geocoding key.
 * They call these authenticated endpoints; only the platform-restricted map
 * renderer keys are embedded in the Android/iOS binaries.
 */

const config = require('../../config');
const { AppError } = require('../../shared/errors');

const PLACES_BASE = 'https://places.googleapis.com/v1';
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

const mapsError = (message, code = 'MAPS_UNAVAILABLE', statusCode = 503) =>
  new AppError(message, statusCode, code);

const requireKey = () => {
  const key = config.maps?.serverApiKey;
  if (!key) {
    throw mapsError(
      'Location search is temporarily unavailable.',
      'MAPS_NOT_CONFIGURED'
    );
  }
  return key;
};

const requestJson = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  } catch (error) {
    throw mapsError('Location provider could not be reached.');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerCode = body?.error?.status || body?.status || null;
    const error = mapsError('Location provider rejected the request.');
    error.meta = { providerCode };
    throw error;
  }
  return body;
};

const component = (components = [], ...types) => {
  for (const type of types) {
    const match = components.find((item) => item.types?.includes(type));
    const value = match?.longText || match?.long_name;
    if (value) return value;
  }
  return '';
};

const normalizePlace = (place = {}) => ({
  address: place.formattedAddress || place.formatted_address || '',
  latitude: place.location?.latitude ?? place.geometry?.location?.lat ?? null,
  longitude: place.location?.longitude ?? place.geometry?.location?.lng ?? null,
  city: component(
    place.addressComponents || place.address_components,
    'locality',
    'administrative_area_level_2',
    'administrative_area_level_1'
  ),
  country: component(place.addressComponents || place.address_components, 'country'),
  placeId: place.id || place.place_id || null,
  provider: 'google',
});

async function autocomplete({ q, language = 'ar', sessionToken, latitude, longitude }) {
  const key = requireKey();
  const body = {
    input: q,
    languageCode: language,
    regionCode: 'SA',
    includedRegionCodes: ['SA'],
  };
  if (sessionToken) body.sessionToken = sessionToken;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    body.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius: 100000,
      },
    };
  }

  const result = await requestJson(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'suggestions.placePrediction.placeId',
        'suggestions.placePrediction.text.text',
        'suggestions.placePrediction.structuredFormat.mainText.text',
        'suggestions.placePrediction.structuredFormat.secondaryText.text',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  return {
    predictions: (result.suggestions || [])
      .map((item) => item.placePrediction)
      .filter((item) => item?.placeId)
      .slice(0, 5)
      .map((item) => ({
        placeId: item.placeId,
        description: item.text?.text || '',
        mainText: item.structuredFormat?.mainText?.text || item.text?.text || '',
        secondaryText: item.structuredFormat?.secondaryText?.text || '',
      })),
  };
}

async function placeDetails({ placeId, language = 'ar', sessionToken }) {
  const key = requireKey();
  const query = new URLSearchParams({ languageCode: language, regionCode: 'SA' });
  if (sessionToken) query.set('sessionToken', sessionToken);
  const place = await requestJson(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?${query}`,
    {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents',
      },
    }
  );
  return { location: normalizePlace(place) };
}

async function reverseGeocode({ latitude, longitude, language = 'ar' }) {
  const key = requireKey();
  const query = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    language,
    region: 'sa',
    key,
  });
  const result = await requestJson(`${GEOCODE_BASE}?${query}`);
  if (result.status !== 'OK' || !result.results?.[0]) {
    throw mapsError('No address was found for this point.', 'MAPS_ADDRESS_NOT_FOUND', 404);
  }
  const normalized = normalizePlace(result.results[0]);
  normalized.latitude = latitude;
  normalized.longitude = longitude;
  return { location: normalized };
}

module.exports = { autocomplete, placeDetails, reverseGeocode, normalizePlace };

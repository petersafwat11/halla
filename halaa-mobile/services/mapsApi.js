import { ENDPOINTS } from '../config/api';
import { apiFetch } from './http';

const unwrap = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || 'Location service is unavailable.');
    error.status = response.status;
    error.code = body?.code || 'MAPS_UNAVAILABLE';
    error.requestId = body?.requestId || response.headers?.get?.('x-request-id') || null;
    throw error;
  }
  return body?.data ?? body;
};

const queryString = (values) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params.toString();
};

export async function autocompletePlaces({
  query,
  language,
  sessionToken,
  latitude,
  longitude,
}) {
  const qs = queryString({
    q: query,
    language,
    sessionToken,
    latitude,
    longitude,
  });
  const data = await unwrap(
    await apiFetch(`${ENDPOINTS.LOCATIONS.GOOGLE_AUTOCOMPLETE}?${qs}`)
  );
  return data?.predictions || [];
}

export async function getPlaceDetails({ placeId, language, sessionToken }) {
  const qs = queryString({ language, sessionToken });
  const data = await unwrap(
    await apiFetch(`${ENDPOINTS.LOCATIONS.GOOGLE_PLACE_DETAILS(placeId)}?${qs}`)
  );
  return data?.location || data;
}

export async function reverseGeocode({ latitude, longitude, language }) {
  const qs = queryString({ latitude, longitude, language });
  const data = await unwrap(
    await apiFetch(`${ENDPOINTS.LOCATIONS.GOOGLE_REVERSE_GEOCODE}?${qs}`)
  );
  return data?.location || data;
}

export default { autocompletePlaces, getPlaceDetails, reverseGeocode };

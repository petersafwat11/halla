/**
 * Coerce a coordinate to a finite number within ±limit, or null.
 * null/undefined, blank or whitespace-only strings, non-numeric strings and
 * non-number/string values never become 0.
 */
export function normalizeCoordinate(value, limit = Infinity) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    value = trimmed;
  } else if (typeof value !== 'number') {
    return null;
  }
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= limit ? coordinate : null;
}

/** Both coordinates as numbers, or both null when either is missing/invalid. */
export function normalizeEventCoordinates(value) {
  const latitude = normalizeCoordinate(value?.latitude, 90);
  const longitude = normalizeCoordinate(value?.longitude, 180);
  return latitude === null || longitude === null
    ? { latitude: null, longitude: null }
    : { latitude, longitude };
}

export function hasEventCoordinates(value) {
  return normalizeEventCoordinates(value).latitude !== null;
}

export function normalizeEventLocation(value, coordinate = {}) {
  const source = typeof value === 'string' ? { address: value } : value || {};
  const point = hasEventCoordinates(source) ? source : coordinate;
  const { latitude, longitude } = normalizeEventCoordinates(point);
  const pinned = latitude !== null;
  return {
    address: source.address || '',
    latitude,
    longitude,
    city: source.city || '', country: source.country || '',
    placeId: source.placeId || null,
    provider: pinned ? source.provider || 'google' : 'manual',
  };
}

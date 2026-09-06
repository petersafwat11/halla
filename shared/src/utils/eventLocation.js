export function hasEventCoordinates(value) {
  return value?.latitude != null && value?.longitude != null &&
    value.latitude !== '' && value.longitude !== '' &&
    Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude)) &&
    Math.abs(Number(value.latitude)) <= 90 && Math.abs(Number(value.longitude)) <= 180;
}

export function normalizeEventLocation(value, coordinate = {}) {
  const source = typeof value === 'string' ? { address: value } : value || {};
  const point = hasEventCoordinates(source) ? source : coordinate;
  const pinned = hasEventCoordinates(point);
  return {
    address: source.address || '',
    latitude: pinned ? Number(point.latitude) : null,
    longitude: pinned ? Number(point.longitude) : null,
    city: source.city || '', country: source.country || '',
    placeId: source.placeId || null,
    provider: pinned ? source.provider || 'google' : 'manual',
  };
}

export const PLAN_REFRESH_SECONDS = 300;
export const PLAN_MAX_AGE_MS = 60 * 60 * 1000;

export function planPrice(plan) {
  const price = plan?.pricing?.oneTime ?? plan?.price;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : null;
}

// Accept only the public catalog shape; never turn missing prices into zero.
export function normalizeLandingPlans(payload) {
  const data = payload?.data;
  if (!data || typeof data !== 'object' || (!data.host && !data.business)) return null;
  const list = (value) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some(p => !p || !p.code || planPrice(p) === null)) {
      throw new Error('Invalid public plan catalog');
    }
    return value;
  };
  return { ...payload, data: {
    host: Object.fromEntries(['basic', 'premium'].map(family => [family,
      Object.fromEntries(['event', 'monthly'].map(period => [period, list(data.host?.[family]?.[period])]))])),
    business: Object.fromEntries(['event', 'quarterly', 'annual'].map(period => [period, list(data.business?.[period])])),
  } };
}

export function usablePlanSnapshot(snapshot, now = Date.now()) {
  return !!snapshot && Number.isFinite(snapshot.fetchedAt)
    && now >= snapshot.fetchedAt && now - snapshot.fetchedAt <= PLAN_MAX_AGE_MS;
}

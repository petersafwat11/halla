import 'server-only';
import { unstable_cache } from 'next/cache';
import { normalizeLandingPlans, PLAN_REFRESH_SECONDS, usablePlanSnapshot } from './landingPlansData';

// Throw inside the cache callback so failed refreshes never replace good data.
const readCachedPlans = unstable_cache(async (base) => {
  const response = await fetch(`${base}/plans/landing`, {
    cache: 'no-store', signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error('Public pricing unavailable');
  const payload = normalizeLandingPlans(await response.json());
  if (!payload) throw new Error('Invalid public pricing response');
  return { ...payload, fetchedAt: Date.now() };
}, ['landing-public-plans-v2'], { revalidate: PLAN_REFRESH_SECONDS });

export async function getLandingPlans() {
  const base = (process.env.INTERNAL_API_URL || 'http://localhost:8000/api/v2').replace(/\/$/, '');
  try {
    const snapshot = await readCachedPlans(base);
    return usablePlanSnapshot(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}

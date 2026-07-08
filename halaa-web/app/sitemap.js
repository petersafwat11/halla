/**
 * app/sitemap.js — Next.js sitemap file convention (SEO-ASO-METADATA-PLAN §3.3).
 *
 * OFFLINE-SAFE BY CONTRACT: `npm run build` is the key gate and runs with NO
 * backend reachable. This function therefore ALWAYS returns the static public
 * URL set (landing, marketplace, and all Session-5 legal routes × ar/en) with
 * reciprocal-language `alternates`. Dynamic approved-vendor URLs are appended
 * best-effort inside a try/catch that degrades to nothing on any error/timeout —
 * a fetch failure must never throw or hang the build.
 *
 * Only INDEXABLE, canonical, public URLs are included (per `ROUTE_INVENTORY`);
 * no token/dashboard/checkout/post-event URLs ever appear. Full vendor
 * population against a live DB is a known limitation of the offline build (see
 * SEO-ROUTE-INVENTORY.md).
 */

import {
  ROUTE_INVENTORY,
  isIndexable,
  canonicalUrl,
  hreflangAlternates,
} from "@halaa/shared/brand";

const LOCALES = ["ar", "en"];

/** Static indexable routes from the signed inventory (exclude dynamic ones). */
const STATIC_INDEXABLE_PATHS = ROUTE_INVENTORY.filter(
  (r) => isIndexable(r.routeClass) && r.sitemap === true
).map((r) => r.path.replace(/^\/\[lang\]/, "")); // strip the /[lang] prefix -> "" for landing

function staticEntries() {
  const entries = [];
  for (const path of STATIC_INDEXABLE_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: canonicalUrl(locale, path),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1.0 : 0.6,
        alternates: { languages: hreflangAlternates(path) },
      });
    }
  }
  return entries;
}

/**
 * Best-effort approved-vendor URLs. Never throws; returns [] on any problem so
 * the offline production build always succeeds.
 */
async function vendorEntries() {
  const apiBase = process.env.INTERNAL_API_URL;
  if (!apiBase) return []; // no backend configured (offline build) -> skip
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${apiBase}/vendors/public?limit=200`, {
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return [];
    const payload = await res.json();
    const vendors = payload?.data || [];
    const entries = [];
    for (const v of vendors) {
      const id = v?.id || v?._id;
      if (!id) continue;
      const path = `market-place/vendors/${id}`;
      for (const locale of LOCALES) {
        entries.push({
          url: canonicalUrl(locale, path),
          changeFrequency: "weekly",
          priority: 0.5,
          alternates: { languages: hreflangAlternates(path) },
          lastModified: v?.updatedAt ? new Date(v.updatedAt) : undefined,
        });
      }
    }
    return entries;
  } catch {
    return []; // network/DB unreachable during build -> degrade gracefully
  }
}

export default async function sitemap() {
  const statics = staticEntries();
  const vendors = await vendorEntries();
  return [...statics, ...vendors];
}

/**
 * @halla/shared/brand/storeLimits — App Store & Google Play metadata field
 * limit validators (SEO-ASO-METADATA-PLAN §7.2, §7.3, §10).
 *
 * CRITICAL: Apple's keyword field is limited by BYTES (100), not characters.
 * Arabic characters are ~2 bytes each in UTF-8, so a 60-character Arabic keyword
 * string can exceed 100 bytes. Every other field is a CHARACTER limit.
 *
 * Pure + dependency-free (uses TextEncoder for byte counts so it runs in both
 * Node and bundlers). Used by `scripts/validate-aso-metadata.mjs` and the ASO
 * unit tests to fail CI on any over-limit committed store text.
 *
 * Official limits:
 *  - Apple:  https://developer.apple.com/help/app-store-connect/reference/app-information/
 *  - Google: https://support.google.com/googleplay/android-developer/answer/9859152
 */

/** Character length (code points, so emoji/astral count as 1). */
export function charLength(str) {
  return str == null ? 0 : Array.from(String(str)).length;
}

/** UTF-8 byte length (Apple keyword field). */
export function byteLength(str) {
  if (str == null) return 0;
  // TextEncoder is available in Node >=11 and all bundlers.
  return new TextEncoder().encode(String(str)).length;
}

/**
 * Field spec: { platform, field, limit, unit }.
 * unit: "char" (character/code-point count) | "byte" (UTF-8 bytes).
 */
export const APPLE_LIMITS = Object.freeze({
  name: { limit: 30, unit: "char" },
  subtitle: { limit: 30, unit: "char" },
  promotionalText: { limit: 170, unit: "char" },
  description: { limit: 4000, unit: "char" },
  keywords: { limit: 100, unit: "byte" }, // BYTES, not chars
  whatsNew: { limit: 4000, unit: "char" },
});

export const GOOGLE_LIMITS = Object.freeze({
  name: { limit: 30, unit: "char" },
  shortDescription: { limit: 80, unit: "char" },
  fullDescription: { limit: 4000, unit: "char" },
  releaseNotes: { limit: 500, unit: "char" },
});

function measure(value, unit) {
  return unit === "byte" ? byteLength(value) : charLength(value);
}

/**
 * Validate one field value against a spec.
 * @returns {{ ok: boolean, used: number, limit: number, unit: string }}
 */
export function checkField(value, spec) {
  const used = measure(value, spec.unit);
  return { ok: used <= spec.limit, used, limit: spec.limit, unit: spec.unit };
}

/**
 * Validate a whole listing object against a platform's limit map.
 * Only fields present in BOTH the value object and the limit map are checked;
 * `BLOCKED_NEEDS_OWNER` placeholder values are skipped (not real copy yet).
 * @param {Record<string,string>} listing field -> value
 * @param {Record<string,{limit:number,unit:string}>} limits
 * @returns {{ ok: boolean, violations: Array, checked: number, skipped: number }}
 */
export function validateListing(listing, limits) {
  const violations = [];
  let checked = 0;
  let skipped = 0;
  for (const [field, spec] of Object.entries(limits)) {
    const value = listing[field];
    if (value == null) continue;
    if (typeof value === "string" && value.includes("BLOCKED_NEEDS_OWNER")) {
      skipped += 1;
      continue;
    }
    checked += 1;
    const res = checkField(value, spec);
    if (!res.ok) {
      violations.push({ field, used: res.used, limit: res.limit, unit: res.unit });
    }
  }
  return { ok: violations.length === 0, violations, checked, skipped };
}

export const STORE_LIMITS = Object.freeze({ apple: APPLE_LIMITS, google: GOOGLE_LIMITS });

export default { charLength, byteLength, checkField, validateListing, APPLE_LIMITS, GOOGLE_LIMITS };

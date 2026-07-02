/**
 * validate-aso-metadata.mjs — ASO store-text limit validator (SEO-01/ASO-01,
 * SEO-ASO-METADATA-PLAN §7.2/§7.3/§10).
 *
 * Reads the committed Apple/Google listing TEMPLATES and validates every field
 * value that is present against the platform's character/BYTE limits (Apple
 * keywords = bytes). `BLOCKED_NEEDS_OWNER` placeholder values and `proposal`
 * strings are validated too (so a proposed value that would overflow is caught
 * early), but the script never treats "blocked" as a failure — it reports the
 * approval status so nothing is submitted before the owner signs.
 *
 * Run: `node shared/scripts/validate-aso-metadata.mjs`
 * Exit non-zero only on an actual over-limit value or a schema problem.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  APPLE_LIMITS,
  GOOGLE_LIMITS,
  charLength,
  byteLength,
} from "../src/brand/storeLimits.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, "../../docs/store-readiness/store-metadata");

const FILES = [
  { path: resolve(DOCS, "apple-listing.template.json"), limits: APPLE_LIMITS, platform: "apple" },
  { path: resolve(DOCS, "google-listing.template.json"), limits: GOOGLE_LIMITS, platform: "google" },
];

function measure(value, unit) {
  return unit === "byte" ? byteLength(value) : charLength(value);
}

let violations = 0;
let approvedCount = 0;
let blockedCount = 0;
let checkedValues = 0;

for (const { path, limits, platform } of FILES) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`[ASO] cannot read ${platform} template: ${e.message}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`\n=== ${platform.toUpperCase()} (${doc._meta?.templateVersion || "?"}) ===`);
  const locs = doc.localizations || {};
  for (const [locale, fields] of Object.entries(locs)) {
    for (const [field, spec] of Object.entries(fields)) {
      const limitSpec = limits[field];
      if (!limitSpec) continue; // field not size-limited (e.g. urls)
      if (spec.approved) approvedCount += 1;
      else blockedCount += 1;

      // Validate the concrete value if present, else the proposal (early warning).
      const candidate = spec.value != null ? spec.value : spec.proposal;
      if (candidate == null) continue;
      checkedValues += 1;
      const used = measure(candidate, limitSpec.unit);
      const ok = used <= limitSpec.limit;
      const tag = spec.approved ? "APPROVED" : "blocked ";
      const which = spec.value != null ? "value" : "proposal";
      const status = ok ? "ok" : "OVER LIMIT";
      console.log(
        `  [${tag}] ${locale}.${field} (${which}): ${used}/${limitSpec.limit} ${limitSpec.unit} — ${status}`
      );
      if (!ok) violations += 1;
    }
  }
}

console.log(
  `\n[ASO] checked ${checkedValues} values · approved fields ${approvedCount} · blocked fields ${blockedCount} · over-limit ${violations}`
);
console.log(
  "[ASO] NOTE: every 'blocked' field is BLOCKED_NEEDS_OWNER and must NOT be submitted until the owner + counsel sign it."
);

if (violations > 0) {
  console.error(`[ASO] FAIL: ${violations} field(s) exceed the store limit.`);
  process.exit(1);
}
console.log("[ASO] PASS: no field exceeds its store character/byte limit.");

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("EVT-01: EventSummary destructures currentLanguage and includes it in useMemo dependencies", () => {
  const source = read("components", "createEvent", "EventSummary.js");

  // Destructures currentLanguage from useTranslation
  assert.match(
    source,
    /const\s*\{\s*t\s*,\s*currentLanguage\s*\}\s*=\s*useTranslation\(["']createEvent["']\);/,
    "EventSummary must destructure currentLanguage from useTranslation('createEvent')"
  );

  // Uses currentLanguage in locale date formatting (shared helper is
  // imported aliased as formatLocaleDate).
  assert.match(
    source,
    /format(?:Locale|Event)?Date\(\s*eventDate\s*,\s*currentLanguage\s*\|\|\s*["']ar["']\s*\)/,
    "EventSummary must pass currentLanguage to the shared date formatter"
  );

  // Includes currentLanguage in resolvedInvitation useMemo dependencies
  assert.match(
    source,
    /useMemo\(\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[\s\S]*?\bcurrentLanguage\b[\s\S]*?\]\);/,
    "EventSummary must include currentLanguage in useMemo dependencies"
  );
});


test("eslint.config.mjs enforces safety lint rules as errors", () => {
  const source = read("eslint.config.mjs");

  const requiredRules = [
    "no-undef",
    "no-unreachable",
    "no-dupe-keys",
    "valid-typeof",
    "no-unsafe-optional-chaining",
  ];

  for (const rule of requiredRules) {
    const pattern = new RegExp(`['"]${rule}['"]\\s*:\\s*['"]error['"]`);
    assert.match(
      source,
      pattern,
      `eslint.config.mjs must enforce '${rule}' as 'error'`
    );
  }
});

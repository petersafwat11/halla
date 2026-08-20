const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const LOCALES_DIR = path.resolve(__dirname, "..", "..", "localization", "locales");

// Ad-hoc directional marks (LRM U+200E, RLM U+200F, and the deprecated
// embedding/override controls) are forbidden in translations. Inline LTR
// runs inside Arabic copy must use LRI/PDI isolates (U+2066/U+2069) — or
// the isolateLtr()/isolateRtl() helpers for dynamically composed strings.
const FORBIDDEN = /[\u200E\u200F\u202A-\u202E\u206A-\u206F]/;

function localeJsonFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(dir, e.name));
}

test("translations contain no ad-hoc LRM/RLM directional marks", () => {
  const violations = [];

  for (const locale of ["ar", "en"]) {
    for (const file of localeJsonFiles(path.join(LOCALES_DIR, locale))) {
      const raw = fs.readFileSync(file, "utf8");
      if (!FORBIDDEN.test(raw)) continue;
      const lines = raw.split("\n");
      lines.forEach((line, idx) => {
        if (FORBIDDEN.test(line)) {
          violations.push(
            `${locale}/${path.basename(file)}:${idx + 1} contains LRM/RLM/embedding controls — use LRI/PDI isolates instead`
          );
        }
      });
    }
  }

  assert.deepEqual(violations, [], violations.join("\n"));
});

test("isolate marks (LRI/PDI), when used, are balanced in translations", () => {
  const violations = [];
  const LRI = "\u2066";
  const RLI = "\u2067";
  const PDI = "\u2069";

  for (const locale of ["ar", "en"]) {
    for (const file of localeJsonFiles(path.join(LOCALES_DIR, locale))) {
      const raw = fs.readFileSync(file, "utf8");
      const opens = (raw.match(new RegExp(`[${LRI}${RLI}]`, "g")) || []).length;
      const closes = (raw.match(new RegExp(PDI, "g")) || []).length;
      if (opens !== closes) {
        violations.push(
          `${locale}/${path.basename(file)}: ${opens} isolate opens vs ${closes} PDI closes`
        );
      }
    }
  }

  assert.deepEqual(violations, [], violations.join("\n"));
});

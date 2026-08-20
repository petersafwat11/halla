const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_ROOTS = ["components", "screens", "navigation", "contexts"];

/**
 * Reviewed allowlist of files that still contain physical directional style
 * properties (marginLeft, marginRight, paddingLeft, paddingRight,
 * borderLeft/RightWidth, borderLeft/RightColor). Per the remediation plan
 * (§1A.4) this starts as a reviewed allowlist rather than immediately
 * failing all legacy files. A file may only be removed from this list when
 * it has been migrated to logical (start/end) spacing or the remaining
 * physical properties are intentionally physical (absolute overlays,
 * shadows, chart geometry, symmetric hit slop) — in which case annotate
 * the reason in the file.
 *
 * NEW files must NOT be added here; new code uses logical direction.
 */
const ALLOWLIST = new Set([
  // Card-number fields are intrinsically LTR content (plan §2.3), so the
  // absolute card-brand icon anchor (`left`) and its text indent
  // (`paddingLeft`) are intentionally physical; the overlapping MasterCard
  // circles are an LTR brand glyph. See components/plans/PaymentMethodSelector.js.
  "components/plans/PaymentMethodSelector.js",
]);

const PHYSICAL_PATTERN =
  /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\s*:/g;

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

test("physical directional style properties only appear in the reviewed allowlist", () => {
  const violations = [];

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const relPath = path.relative(MOBILE_ROOT, file).replace(/\\/g, "/");
      if (ALLOWLIST.has(relPath)) continue;

      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Ignore comments — they document intent, they do not style.
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        PHYSICAL_PATTERN.lastIndex = 0;
        if (PHYSICAL_PATTERN.test(line)) {
          violations.push(`${relPath}:${idx + 1}: ${trimmed}`);
        }
      });
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Physical directional spacing/borders flip under RTL. Migrate to marginStart/End, paddingStart/End, borderStart/End (or annotate + allowlist with a reason). Found:\n${violations.join("\n")}`
  );
});

test("allowlist entries still exist (no stale allowlist entries)", () => {
  const stale = [];
  for (const relPath of ALLOWLIST) {
    if (!fs.existsSync(path.join(MOBILE_ROOT, relPath))) {
      stale.push(relPath);
    }
  }
  assert.deepEqual(
    stale,
    [],
    `Allowlist references files that no longer exist — remove them:\n${stale.join("\n")}`
  );
});

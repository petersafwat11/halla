const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_ROOTS = ["components", "screens", "navigation", "contexts"];

// Files with documented, allowed row-reverse uses (if any)
const ALLOWLIST = new Set([
  // "screens/legal/LegalScreen.js", // Will be removed in Phase 2
  // "components/home/EventTemplates.js", // Will be removed in Phase 6
]);

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

test("no unapproved live row-reverse styles in mobile codebase", () => {
  const violations = [];
  const rowReversePattern = /flexDirection\s*:\s*["']row-reverse["']/g;

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const relPath = path.relative(MOBILE_ROOT, file).replace(/\\/g, "/");
      if (ALLOWLIST.has(relPath)) continue;

      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        // Ignore single-line comments
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

        if (rowReversePattern.test(line)) {
          violations.push(`${relPath}:${idx + 1}: ${trimmed}`);
        }
      });
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Live row-reverse double-flips RTL layouts. Found violations:\n${violations.join("\n")}`
  );
});

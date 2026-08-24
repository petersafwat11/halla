const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_ROOTS = [
  "components",
  "constants",
  "contexts",
  "hooks",
  "localization",
  "navigation",
  "screens",
  "services",
  "styles",
  "utils",
];
const ENTRY_FILES = ["App.js", "index.js"];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const RESOLUTION_SUFFIXES = [
  "",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".native.js",
  ".android.js",
  ".ios.js",
  "/index.js",
  "/index.jsx",
  "/index.mjs",
];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function resolves(fromFile, specifier) {
  const target = path.resolve(path.dirname(fromFile), specifier);
  return RESOLUTION_SUFFIXES.some((suffix) => fs.existsSync(target + suffix));
}

test("every source relative import resolves to a file or directory entrypoint", () => {
  const files = [
    ...ENTRY_FILES.map((file) => path.join(ROOT, file)),
    ...SOURCE_ROOTS.flatMap((directory) => walk(path.join(ROOT, directory))),
  ];
  const failures = [];
  const importPattern = /(?:from\s*|import\s*\(|require\s*\()\s*["'](\.[^"']+)["']/g;

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      if (!resolves(file, match[1])) {
        failures.push(`${path.relative(ROOT, file)} -> ${match[1]}`);
      }
    }
  }

  assert.deepEqual(failures, [], `Unresolved relative imports:\n${failures.join("\n")}`);
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_ROOTS = ["components", "screens"];

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

test("directional icon names mirror horizontally only for RTL", async () => {
  const resolverPath = path.resolve(
    MOBILE_ROOT,
    "..",
    "shared",
    "src",
    "utils",
    "directionalIcons.js"
  );
  const { resolveDirectionalIconName } = await import(
    pathToFileURL(resolverPath).href
  );

  assert.equal(resolveDirectionalIconName("arrow-back", false), "arrow-back");
  assert.equal(resolveDirectionalIconName("arrow-back", true), "arrow-forward");
  assert.equal(resolveDirectionalIconName("chevron-forward-outline", true), "chevron-back-outline");
  assert.equal(resolveDirectionalIconName("arrow-up-forward-outline", true), "arrow-up-back-outline");
  assert.equal(resolveDirectionalIconName("return-up-back-outline", true), "return-up-forward-outline");
  assert.equal(resolveDirectionalIconName("chevron-down", true), "chevron-down");
});

test("horizontal Ionicons use the live-language directional component", () => {
  const failures = [];
  const rawIonicon = /<Ionicons\b[\s\S]*?\/>/g;
  const horizontalName = /(?:arrow|chevron|caret|return)[^\s"'}]*(?:back|forward|left|right)|(?:back|forward|left|right)[^\s"'}]*(?:arrow|chevron|caret)/i;

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const source = fs.readFileSync(file, "utf8");
      for (const tag of source.match(rawIonicon) || []) {
        if (horizontalName.test(tag)) {
          failures.push(`${path.relative(MOBILE_ROOT, file)}: ${tag.replace(/\s+/g, " ")}`);
        }
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Directional icons must use <DirectionalIonicon>: ${failures.join("\n")}`
  );
});

test("horizontal arrows are not hardcoded as text or image assets", () => {
  const failures = [];
  const arrowText = /<Text\b[^>]*>\s*[←→‹›]/;
  const arrowImage = /(?:source|require)[^\n]*arrow-(?:left|right)\.png/i;

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const source = fs.readFileSync(file, "utf8");
      if (arrowText.test(source) || arrowImage.test(source)) {
        failures.push(path.relative(MOBILE_ROOT, file));
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Hardcoded horizontal arrows bypass the selected language: ${failures.join(", ")}`
  );
});

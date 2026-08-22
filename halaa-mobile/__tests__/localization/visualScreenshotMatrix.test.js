const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");

test("direction screenshot matrix covers Arabic and English on Android and iOS", () => {
  const matrix = JSON.parse(
    fs.readFileSync(path.join(ROOT, ".maestro", "visual-matrix.json"), "utf8")
  );
  assert.deepEqual(matrix.platforms.sort(), ["android", "ios"]);
  assert.deepEqual(matrix.locales.sort(), ["ar", "en"]);
  assert.deepEqual(matrix.captures.sort(), ["fields", "preview"]);

  for (const locale of matrix.locales) {
    const flowPath = path.join(ROOT, matrix.flows[locale]);
    const flow = fs.readFileSync(flowPath, "utf8");
    assert.match(flow, /takeScreenshot:\s*["']direction-fields-/);
    assert.match(flow, /takeScreenshot:\s*["']direction-preview-/);
    assert.match(flow, /id:\s*["']direction-visual-root["']/);
  }
});

test("visual direction fixture is registered as a deep-linkable native screen", () => {
  const app = fs.readFileSync(path.join(ROOT, "App.js"), "utf8");
  const navigator = fs.readFileSync(path.join(ROOT, "navigation", "AppNavigator.js"), "utf8");
  const fixture = fs.readFileSync(
    path.join(ROOT, "screens", "dev", "DirectionVisualTestScreen.js"),
    "utf8"
  );

  assert.match(app, /DirectionVisualTest:\s*["']__visual\/direction["']/);
  assert.match(navigator, /name=["']DirectionVisualTest["']/);
  assert.match(fixture, /testID=["']direction-visual-root["']/);
  assert.match(fixture, /<PreviewInvitation/);
  assert.match(fixture, /<TextAreaInput/);
});

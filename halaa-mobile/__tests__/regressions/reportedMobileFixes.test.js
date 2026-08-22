const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("plans compensation imports BiDi helpers from their real module", () => {
  const source = read("components", "plans", "PlanDescription.js");
  assert.match(source, /from ["']@halaa\/shared\/utils\/bidi["']/);
  assert.doesNotMatch(
    source,
    /import\s*\{[^}]*isolate(?:Ltr|Rtl)[^}]*\}\s*from\s*["']@halaa\/shared\/utils\/locale["']/s
  );
});

test("all mobile auth transports identify the native client", () => {
  for (const parts of [
    ["services", "http.js"],
    ["services", "authErrors.js"],
    ["hooks", "auth", "_api.js"],
  ]) {
    assert.match(
      read(...parts),
      /["']X-Client["']\s*:\s*["']mobile["']/,
      `${parts.join("/")} must preserve the mobile refresh-token contract`
    );
  }
});

test("event location picker mounts Google Maps and keeps web-service keys on the backend", () => {
  const source = read("components", "commen", "MapPicker.js");
  assert.match(source, /from\s+["']react-native-maps["']/);
  assert.match(source, /<MapView\b/);
  assert.match(source, /provider=\{PROVIDER_GOOGLE\}/);
  assert.match(source, /mapsApi\.(autocompletePlaces|getPlaceDetails|reverseGeocode)/);
  assert.doesNotMatch(source, /maps\.googleapis\.com/);
});

test("protected template backgrounds are authenticated and cannot bake as blank", () => {
  const canvas = read("components", "shared", "TemplatePreviewCanvas.js");
  const stepThree = read("components", "createEvent", "StepThree.js");

  assert.match(canvas, /Authorization:\s*`Bearer \$\{token\}`/);
  assert.match(canvas, /onBackgroundError/);
  assert.match(canvas, /onBackgroundReady\?\.\(false\)/);
  assert.doesNotMatch(
    canvas,
    /onError[\s\S]{0,300}onBackgroundReady\?\.\(true\)/
  );
  assert.match(stepThree, /template_background_failed/);
});

test("offerings wait for the identified RevenueCat configuration", () => {
  const source = read("services", "purchases.js");
  assert.match(source, /const waitForConfiguration\s*=\s*async/);
  assert.match(source, /getAllOfferings[\s\S]*await waitForConfiguration\(\)/);
  assert.match(source, /startsWith\(["']appl_["']\)/);
  assert.match(source, /startsWith\(["']goog_["']\)/);
});

test("reported RTL and horizontal-tab layout regressions stay fixed", () => {
  const guest = read("components", "events", "GuestListItem.js");
  const marketplace = read("screens", "common", "Marketplace.js");
  const topBar = read("components", "plans", "TopBar.js");

  assert.match(guest, /borderStartWidth\s*:\s*6/);
  assert.doesNotMatch(guest, /borderEndWidth\s*:\s*6/);
  assert.match(marketplace, /categoriesScroll\s*:\s*\{[^}]*flexGrow\s*:\s*0/s);
  assert.doesNotMatch(topBar, /position\s*:\s*["']absolute["']/);
});

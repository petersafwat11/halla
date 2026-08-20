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

test("event location picker does not mount the unconfigured native map SDK", () => {
  const source = read("components", "commen", "MapPicker.js");
  assert.doesNotMatch(source, /from\s+["']react-native-maps["']/);
  assert.doesNotMatch(source, /<MapView\b/);
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

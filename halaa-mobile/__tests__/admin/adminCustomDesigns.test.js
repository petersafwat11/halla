const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

test("AdminCustomDesignsScreen: contract, keyboard safety, and directional rules", () => {
  const source = read("screens/admin/admin-dashboard/AdminCustomDesignsScreen.js");

  // Hook usage
  assert.ok(source.includes("useAdminFulfillment"), "Must call useAdminFulfillment query");
  assert.ok(source.includes("useAdminTransitionFulfillment"), "Must call useAdminTransitionFulfillment mutation");

  // Single valid next action
  assert.ok(source.includes("getNextFulfillmentStatus(item.status)"), "Must determine next status using getNextFulfillmentStatus");
  assert.ok(source.includes("nextActionLabels[nextStatus]"), "Must only display button for next status");

  // Keyboard safe modal sheet and input direction
  assert.ok(source.includes("KeyboardSafeModalSheet"), "Modal must use KeyboardSafeModalSheet");
  assert.ok(source.includes("DirectionalTextInput"), "Inputs must use DirectionalTextInput");
  assert.ok(!/TextInput\s+as\s+\w+\}?\s*from\s+"react-native"/.test(source), "Must not import native TextInput from react-native");

  // Directional icon
  assert.ok(source.includes("DirectionalIonicon"), "Flow arrow must use DirectionalIonicon");

  // No physical directional styles
  const PHYSICAL =
    /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\s*:/;
  const lines = source.split("\n");
  const violations = lines
    .map((l, i) => ({ line: l.trim(), i }))
    .filter(({ line }) => !line.startsWith("//") && !line.startsWith("*") && PHYSICAL.test(line));
  assert.deepEqual(violations, [], "AdminCustomDesignsScreen must not contain physical directional styles");
});

test("Custom designs admin permissions and navigation registration", () => {
  const permissionsSrc = read("utils/adminPermissions.js");
  assert.ok(permissionsSrc.includes('CUSTOM_DESIGNS: "custom_designs"'), "PAGES must define CUSTOM_DESIGNS");

  const moreSrc = read("screens/admin/admin-dashboard/AdminMoreScreen.js");
  assert.ok(moreSrc.includes("PAGES.CUSTOM_DESIGNS"), "AdminMoreScreen must include CUSTOM_DESIGNS menu item");
  assert.ok(moreSrc.includes("AdminCustomDesigns"), "AdminMoreScreen must navigate to AdminCustomDesigns");

  const navSrc = read("navigation/AdminNavigator.js");
  assert.ok(navSrc.includes("AdminCustomDesignsScreen"), "AdminNavigator must import AdminCustomDesignsScreen");
  assert.ok(navSrc.includes('name="AdminCustomDesigns"'), "AdminNavigator must register AdminCustomDesigns screen");
});

test("Admin permissions matrix allows only authorized roles for custom designs", () => {
  const { canViewPage, PAGES } = require("../../utils/adminPermissions");

  assert.equal(canViewPage("super_admin", PAGES.CUSTOM_DESIGNS), true);
  assert.equal(canViewPage("admin", PAGES.CUSTOM_DESIGNS), true);
  assert.equal(canViewPage("moderator", PAGES.CUSTOM_DESIGNS), true);
  assert.equal(canViewPage("host", PAGES.CUSTOM_DESIGNS), false);
  assert.equal(canViewPage("vendor", PAGES.CUSTOM_DESIGNS), false);
  assert.equal(canViewPage(null, PAGES.CUSTOM_DESIGNS), false);
});

test("Custom designs localization keys exist in both AR and EN", () => {
  const arAdmin = JSON.parse(read("localization/locales/ar/admin.json"));
  const enAdmin = JSON.parse(read("localization/locales/en/admin.json"));

  assert.ok(arAdmin.more.customDesigns, "AR more.customDesigns must exist");
  assert.ok(enAdmin.more.customDesigns, "EN more.customDesigns must exist");

  assert.ok(arAdmin.customDesigns, "AR customDesigns section must exist");
  assert.ok(enAdmin.customDesigns, "EN customDesigns section must exist");

  assert.ok(arAdmin.customDesigns.title, "AR customDesigns.title must exist");
  assert.ok(enAdmin.customDesigns.title, "EN customDesigns.title must exist");

  assert.ok(arAdmin.customDesigns.actions.moveToQueue, "AR actions.moveToQueue must exist");
  assert.ok(enAdmin.customDesigns.actions.moveToQueue, "EN actions.moveToQueue must exist");

  assert.ok(arAdmin.customDesigns.actions.startWork, "AR actions.startWork must exist");
  assert.ok(enAdmin.customDesigns.actions.startWork, "EN actions.startWork must exist");

  assert.ok(arAdmin.customDesigns.actions.markFulfilled, "AR actions.markFulfilled must exist");
  assert.ok(enAdmin.customDesigns.actions.markFulfilled, "EN actions.markFulfilled must exist");
});

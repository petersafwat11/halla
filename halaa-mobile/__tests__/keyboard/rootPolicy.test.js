const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");

test("root App.js contains exactly one KeyboardProvider outside navigation", () => {
  const app = fs.readFileSync(path.join(MOBILE_ROOT, "App.js"), "utf8");

  const jsxUses = app.match(/<KeyboardProvider/g) || [];
  assert.equal(
    jsxUses.length,
    1,
    "App.js must render exactly one <KeyboardProvider> (blueprint §6.1)"
  );
  assert.match(
    app,
    /import\s*{\s*KeyboardProvider\s*}\s*from\s*"react-native-keyboard-controller"/,
    "App.js must import KeyboardProvider from react-native-keyboard-controller"
  );

  // Provider sits inside SafeAreaProvider…
  const safeAreaIdx = app.indexOf("<SafeAreaProvider>");
  const providerIdx = app.indexOf("<KeyboardProvider>");
  assert.ok(safeAreaIdx !== -1, "App root must keep SafeAreaProvider");
  assert.ok(providerIdx > safeAreaIdx, "KeyboardProvider must be inside SafeAreaProvider");

  // …and outside the navigation tree; no global avoiding view may wrap
  // NavigationContainer (blueprint §6.1 anti-pattern). Check JSX usage so a
  // prose comment mentioning the term does not trip the scan.
  assert.doesNotMatch(
    app,
    /<KeyboardAvoidingView/,
    "Do not put a global KeyboardAvoidingView around the navigation tree"
  );
});

test("app.json explicitly declares Android softwareKeyboardLayoutMode resize", () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(MOBILE_ROOT, "app.json"), "utf8")
  );
  assert.equal(
    config.expo?.android?.softwareKeyboardLayoutMode,
    "resize",
    "Android keyboard policy must be explicit 'resize' (blueprint §7); never switch globally to pan"
  );
});

test("host, vendor, and admin tab navigators set tabBarHideOnKeyboard", () => {
  const appNavigator = fs.readFileSync(
    path.join(MOBILE_ROOT, "navigation", "AppNavigator.js"),
    "utf8"
  );
  const adminNavigator = fs.readFileSync(
    path.join(MOBILE_ROOT, "navigation", "AdminNavigator.js"),
    "utf8"
  );

  const hostVendorCount = (
    appNavigator.match(/tabBarHideOnKeyboard:\s*true/g) || []
  ).length;
  assert.equal(
    hostVendorCount,
    2,
    "HostTabNavigator and VendorTabNavigator must each set tabBarHideOnKeyboard: true (blueprint §7)"
  );

  assert.match(
    adminNavigator,
    /tabBarHideOnKeyboard:\s*true/,
    "AdminNavigator tabs must set tabBarHideOnKeyboard: true"
  );
});

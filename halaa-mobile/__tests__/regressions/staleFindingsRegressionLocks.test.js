const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("F-01: Login and Signup both import and use MobileInput and shared auth schemas", () => {
  const loginSource = read("components", "auth", "MobileLoginForm.js");
  const signupSource = read("components", "auth", "SignupMobileForm.js");

  // Login imports MobileInput and mobileLoginSchema
  assert.match(loginSource, /import\s*\{[^}]*MobileInput[^}]*\}\s*from\s*"\.\.\/commen"/);
  assert.match(loginSource, /import\s*\{[^}]*mobileLoginSchema[^}]*\}\s*from\s*"\.\.\/\.\.\/utils\/schemas\/authSchemas"/);
  assert.match(loginSource, /<MobileInput/);

  // Signup imports MobileInput and signupMobileSchema
  assert.match(signupSource, /import\s*\{[^}]*MobileInput[^}]*\}\s*from\s*"\.\.\/commen"/);
  assert.match(signupSource, /import\s*\{[^}]*signupMobileSchema[^}]*\}\s*from\s*"\.\.\/\.\.\/utils\/schemas\/authSchemas"/);
  assert.match(signupSource, /<MobileInput/);
});

test("F-01: MobileInput follows fixed +966 prefix contract", () => {
  const mobileInputSource = read("components", "commen", "MobileInput.js");

  // Displays fixed prefix +966
  assert.match(mobileInputSource, /DEFAULT_COUNTRY_PREFIX\s*=\s*"\+966"|\+966/);
  // Uses clampPhoneInput and normalizePhoneNumber from @halaa/shared/utils/phone
  assert.match(mobileInputSource, /@halaa\/shared\/utils\/phone/);
});

test("F-18: new event form defaults have empty eventName and empty eventType", async () => {
  const eventFormModule = await import("../../hooks/events/useEventForm.js");
  const { getDefaultFormValues } = eventFormModule;

  const defaults = getDefaultFormValues();

  // Fresh event form defaults
  assert.equal(defaults.eventName, "", "eventName must initialize to empty string");
  assert.equal(defaults.eventType, "", "eventType must initialize to empty string");
  assert.notEqual(defaults.eventName, "Wedding", "eventName must never be prefilled with Wedding");
});

test("F-18: StepOne event form does not set eventName to Wedding when eventType changes", () => {
  const stepOneSource = read("components", "createEvent", "StepOne.js");

  // Does not prefill or fallback eventName to Wedding
  assert.doesNotMatch(stepOneSource, /eventName.*=.*['"]Wedding['"]/i);
  assert.doesNotMatch(stepOneSource, /setValue\(["']eventName["'],\s*["']Wedding["']\)/i);
});

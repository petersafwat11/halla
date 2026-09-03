const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { getDefaultFormValues } = require("../../hooks/events/useEventForm");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("F-18 Mobile: initial event form state has blank eventName", () => {
  const defaults = getDefaultFormValues();
  assert.equal(defaults.eventName, "", "Initial eventName must be empty string");
  assert.equal(defaults.eventType, "", "Initial eventType must be empty string");
});

test("F-18 Mobile: selecting or changing eventType has no side effect on eventName", () => {
  const stepOneSource = read("components", "createEvent", "StepOne.js");

  // Verify StepOne does not register any watch/listener on eventType that writes to eventName
  assert.doesNotMatch(
    stepOneSource,
    /setValue\(["']eventName["']\s*,\s*[^)]*eventType/i,
    "StepOne must not populate eventName from eventType"
  );
  assert.doesNotMatch(
    stepOneSource,
    /setValue\(["']eventName["']\s*,\s*["'](Wedding|حفل زفاف|عرس)["']\)/i,
    "StepOne must not hardcode wedding prefill into eventName"
  );
});

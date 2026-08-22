const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("iOS Step 1 date/time pickers use a dismissible, light-themed bottom sheet", () => {
  const sheet = read(
    "components",
    "createEvent",
    "_components",
    "IosDateTimePickerSheet.js"
  );

  assert.match(sheet, /<Modal[\s\S]*?transparent[\s\S]*?animationType="slide"/);
  assert.match(sheet, /presentationStyle="overFullScreen"/);
  assert.match(sheet, /onRequestClose=\{onCancel\}/);
  assert.match(sheet, /onPress=\{onCancel\}/);
  assert.match(sheet, /onPress=\{onConfirm\}/);
  assert.match(sheet, /display="spinner"/);
  assert.match(sheet, /textColor="#2C2C2C"/);
  assert.match(sheet, /themeVariant="light"/);
  assert.match(sheet, /Math\.max\(insets\.bottom, 16\)/);
});

test("iOS Step 1 keeps wheel changes in draft state and restores the saved time", () => {
  const step = read("components", "createEvent", "StepOne.js");

  assert.match(step, /const \[draftDate, setDraftDate\] = useState/);
  assert.match(step, /const \[draftTime, setDraftTime\] = useState/);
  assert.match(
    step,
    /const openTimePicker = \(\) => \{[\s\S]*?setDraftTime\(parseEventTime\(eventTime\)\)/
  );
  assert.match(step, /event\?\.type !== "dismissed"/);
  assert.match(step, /onConfirm=\{\(\) => \{[\s\S]*?commitDate\(draftDate\)/);
  assert.match(step, /onConfirm=\{\(\) => \{[\s\S]*?commitTime\(draftTime\)/);
  assert.doesNotMatch(step, /value=\{new Date\(\)\}/);
});

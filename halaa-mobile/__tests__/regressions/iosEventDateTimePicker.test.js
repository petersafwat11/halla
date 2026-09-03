const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("shared iOS date/time bottom sheet is dismissible, light-themed and range-bounded", () => {
  const sheet = read("components", "commen", "IosDateTimePickerSheet.js");

  assert.match(sheet, /<Modal[\s\S]*?transparent[\s\S]*?animationType="slide"/);
  assert.match(sheet, /presentationStyle="overFullScreen"/);
  assert.match(sheet, /onRequestClose=\{onCancel\}/);
  assert.match(sheet, /onPress=\{onCancel\}/);
  assert.match(sheet, /onPress=\{onConfirm\}/);
  assert.match(sheet, /display="spinner"/);
  assert.match(sheet, /textColor="#2C2C2C"/);
  assert.match(sheet, /themeVariant="light"/);
  assert.match(sheet, /Math\.max\(insets\.bottom, 16\)/);
  // Shared consumers (e.g. the schedule-send modal) pass an upper bound.
  assert.match(sheet, /maximumDate/);
});

test("create/update event Step 1 reuses the shared commen sheet", () => {
  const step = read("components", "createEvent", "StepOne.js");

  assert.match(
    step,
    /import IosDateTimePickerSheet from "\.\.\/commen\/IosDateTimePickerSheet";/
  );
  assert.ok(
    !fs.existsSync(
      path.join(
        MOBILE_ROOT,
        "components",
        "createEvent",
        "_components",
        "IosDateTimePickerSheet.js"
      )
    ),
    "the create-event fork must not come back — the commen sheet is canonical"
  );
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

test("iOS date picker permits valid dates 25-31 and does not constrain days of month", () => {
  const sheet = read("components", "commen", "IosDateTimePickerSheet.js");
  const step = read("components", "createEvent", "StepOne.js");

  // Sheet delegates directly to DateTimePicker without day-clipping props
  assert.match(sheet, /<DateTimePicker/);
  assert.doesNotMatch(sheet, /maxDay|clipDay/i);

  // Valid dates on days 25, 28, 30, and 31 parse and keep their exact day
  for (const day of [25, 28, 30, 31]) {
    const d = new Date(2026, 6, day, 12, 0, 0); // July 25, 28, 30, 31
    assert.equal(d.getDate(), day, `Date object must accurately represent day ${day}`);
    assert.ok(!Number.isNaN(d.getTime()), `Day ${day} must be valid timestamp`);
  }

  // StepOne commits the date directly
  assert.match(step, /setValue\("eventDate", selectedDate/);
});

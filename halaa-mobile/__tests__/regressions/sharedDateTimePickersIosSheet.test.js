const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

/**
 * Blueprint §9 Priority 1 — "Migrate unused/common DatePicker and TimePicker
 * to the same contract so other pages cannot regress." Every date/time field
 * in the app (schedule-send modal, event template fields, admin discount
 * forms) flows through these two shared primitives, so they must present the
 * exact iOS experience approved for create/update event Step 1.
 */
for (const [name, kind] of [
  ["DatePicker.js", "date"],
  ["TimePicker.js", "time"],
]) {
  const source = read("components", "commen", name);

  test(`${name}: iOS uses the shared bottom sheet with draft ownership`, () => {
    assert.match(
      source,
      /import IosDateTimePickerSheet from "\.\/IosDateTimePickerSheet";/
    );
    assert.match(source, /Platform\.OS === "ios"/);
    // The raw inline spinner that used to render inside the field container
    // is gone; only the sheet presents a spinner now.
    assert.doesNotMatch(
      source,
      /display=\{Platform\.OS === "ios" \? "spinner"[^}]*\}/,
      "no inline iOS spinner inside the field container"
    );
    assert.match(source, /const \[draft(Date|Time), setDraft\1\] = useState/);
    assert.match(
      source,
      new RegExp(`onConfirm=\\{\\(\\) => \\{[\\s\\S]*?onChange\\(draft(?:Date|Time)\\)`)
    );
    // Android keeps the immediate-commit native dialog as a regression guard.
    assert.match(source, /event\?\.type !== "dismissed"/);
  });

  test(`${name}: follows the shared field-direction contract`, () => {
    assert.match(source, /useFieldDirection\("localized"/);
    // Display values are localized formatted tokens isolated as BiDi runs;
    // labels/errors never change direction with the value.
    assert.match(source, /isolateAuto\(displayValue\)/);
    assert.match(source, /fieldDirection\.text/);
    assert.match(source, /fieldDirection\.input/);
  });

  test(`${name}: anatomy matches the create/update event reference`, () => {
    // Value text first (logical start), semantic icon last (logical end).
    const valueIndex = source.indexOf("{displayValue ? isolateAuto(displayValue) : placeholder}");
    const iconIndex = source.indexOf(`name="${kind === "date" ? "calendar" : "time"}-outline"`);
    assert.ok(valueIndex > -1 && iconIndex > valueIndex, "text precedes the trailing icon");

    const labelStyle = source.match(/label:\s*\{([^}]*)\}/)?.[1] ?? "";
    assert.doesNotMatch(
      labelStyle,
      /paddingHorizontal/,
      "labels share the start edge of sibling TextInput fields"
    );
    assert.match(source, /paddingHorizontal: 16/);
  });

  test(`${name}: sheet chrome defaults to localized common buttons`, () => {
    assert.match(source, /buttons\.cancel/);
    assert.match(source, /buttons\.confirm/);
  });
}

test("ScheduleSendingModal bounds the shared DatePicker on both ends", () => {
  const modal = read("components", "home", "ScheduleSendingModal.js");

  assert.match(modal, /minimumDate=\{minDate\}/);
  assert.match(modal, /maximumDate=\{maxDate\}/);
});

test("every ScheduleSendingModal entry point passes the event upper bound", () => {
  const home = read("screens", "host", "HomeScreen.js");
  const header = read("components", "home", "EventActionsHeader.js");

  // Home entry: lastEvent carries a top-level date (see LastEventHeader) and
  // some payloads nest it under eventDetails — keep the dual fallback.
  assert.match(
    home,
    /eventDate=\{\s*dashboardData\?\.lastEvent\?\.eventDetails\?\.date \|\|\s*dashboardData\?\.lastEvent\?\.date\s*\}/,
    "HomeScreen must bound the schedule window by the event date"
  );
  // Event details entry already forwards the same dual fallback.
  assert.match(header, /eventDate=\{event\?\.eventDetails\?\.date \|\| event\?\.date\}/);
});

test("AutoReminderInfoText reuses the migrated shared pickers", () => {
  const banner = read("components", "admin-dashboard", "events", "AutoReminderInfoText.js");

  assert.match(banner, /<DatePicker\b/);
  assert.match(banner, /<TimePicker\b/);
  assert.doesNotMatch(banner, /@react-native-community\/datetimepicker/);
});

test("ScheduleSendingModal restores an existing schedule time", () => {
  const modal = read("components", "home", "ScheduleSendingModal.js");

  assert.match(modal, /timeFromHHmm\(existingSchedule\?\.scheduledTime\)/);
});

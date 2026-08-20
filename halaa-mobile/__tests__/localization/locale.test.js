const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const SHARED_ROOT = path.resolve(__dirname, "..", "..", "..", "shared");

test("formatDate formats dates correctly in Arabic and English", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatDate } = await import(pathToFileURL(localePath).href);

  const sampleDate = new Date("2026-06-30T15:30:00Z");

  const enDate = formatDate(sampleDate, "en");
  assert.ok(enDate.includes("2026"), "English date includes 2026");
  assert.ok(enDate.includes("Jun") || enDate.includes("June"), "English date includes June");

  const arDate = formatDate(sampleDate, "ar");
  assert.ok(arDate.includes("٢٠٢٦") || arDate.includes("2026"), "Arabic date includes 2026");

  // Invalid date safe fallback
  assert.equal(formatDate(null), "");
  assert.equal(formatDate("invalid-date"), "");
});

test("formatTime formats Date instances and stored time strings", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatTime } = await import(pathToFileURL(localePath).href);

  // Stored string variations
  assert.equal(formatTime("6:30 AM", "en"), "6:30 AM");
  assert.equal(formatTime("6:30:AM", "en"), "6:30 AM");
  assert.equal(formatTime("6:30 AM", "ar"), "٦:٣٠ ص");
  assert.equal(formatTime("6:30:AM", "ar"), "٦:٣٠ ص");

  assert.equal(formatTime("12:00 AM", "en"), "12:00 AM");
  assert.equal(formatTime("12:00 AM", "ar"), "١٢:٠٠ ص");
  assert.equal(formatTime("12:00 PM", "en"), "12:00 PM");
  assert.equal(formatTime("12:00 PM", "ar"), "١٢:٠٠ م");

  assert.equal(formatTime("18:30", "en"), "6:30 PM");
  assert.equal(formatTime("18:30", "ar"), "٦:٣٠ م");

  // Null / empty fallback
  assert.equal(formatTime(null), "");
  assert.equal(formatTime(""), "");
});

test("formatPercent formats percentage strings", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatPercent } = await import(pathToFileURL(localePath).href);

  assert.equal(formatPercent(15, "en"), "15%");
  assert.equal(formatPercent(15, "ar"), "١٥٪");
  assert.equal(formatPercent(null), "");
});

test("formatLocation normalizes and de-duplicates address tokens", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatLocation } = await import(pathToFileURL(localePath).href);

  // De-duplication in English
  const locEn = formatLocation({
    name: "Riyadh Front",
    address: "King Khalid Airport Road, Riyadh Front, Riyadh",
    city: "Riyadh",
  }, "en");
  assert.equal(locEn, "Riyadh Front, King Khalid Airport Road, Riyadh");

  // De-duplication in Arabic
  const locAr = formatLocation({
    name: "واجهة الرياض",
    address: "طريق المطار، واجهة الرياض، الرياض",
    city: "الرياض",
  }, "ar");
  assert.equal(locAr, "واجهة الرياض، طريق المطار، الرياض");

  // String input
  assert.equal(formatLocation("Riyadh, Olaya, Riyadh", "en"), "Riyadh, Olaya");
  assert.equal(formatLocation("الرياض، العليا، الرياض", "ar"), "الرياض، العليا");

  // Empty safe fallback
  assert.equal(formatLocation(null), "");
  assert.equal(formatLocation({}), "");
});

test("formatGuestCount outputs correct pluralized count", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatGuestCount } = await import(pathToFileURL(localePath).href);

  assert.equal(formatGuestCount(0, "ar"), "لا يوجد ضيوف");
  assert.equal(formatGuestCount(1, "ar"), "ضيف واحد");
  assert.equal(formatGuestCount(2, "ar"), "ضيفان");
  assert.equal(formatGuestCount(5, "ar"), "٥ ضيوف");
  assert.equal(formatGuestCount(25, "ar"), "٢٥ ضيفاً");
  assert.equal(formatGuestCount(150, "ar"), "١٥٠ ضيف");

  assert.equal(formatGuestCount(0, "en"), "0 guests");
  assert.equal(formatGuestCount(1, "en"), "1 guest");
  assert.equal(formatGuestCount(10, "en"), "10 guests");
});

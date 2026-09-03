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

test("formatTime formats Date instances and stored time strings using Latin digits (F-15)", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatTime } = await import(pathToFileURL(localePath).href);

  // Stored string variations with Latin digits
  assert.equal(formatTime("6:30 AM", "en"), "6:30 AM");
  assert.equal(formatTime("6:30:AM", "en"), "6:30 AM");
  assert.equal(formatTime("6:30 AM", "ar"), "6:30 ص");
  assert.equal(formatTime("6:30:AM", "ar"), "6:30 ص");

  assert.equal(formatTime("12:00 AM", "en"), "12:00 AM");
  assert.equal(formatTime("12:00 AM", "ar"), "12:00 ص");
  assert.equal(formatTime("12:00 PM", "en"), "12:00 PM");
  assert.equal(formatTime("12:00 PM", "ar"), "12:00 م");

  assert.equal(formatTime("18:30", "en"), "6:30 PM");
  assert.equal(formatTime("18:30", "ar"), "6:30 م");

  // Null / empty fallback
  assert.equal(formatTime(null), "");
  assert.equal(formatTime(""), "");
});

test("formatPercent formats percentage strings with Latin digits (F-15)", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatPercent } = await import(pathToFileURL(localePath).href);

  assert.equal(formatPercent(15, "en"), "15%");
  assert.equal(formatPercent(15, "ar"), "15٪");
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

test("formatGuestCount outputs correct pluralized count with Latin digits (F-15)", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatGuestCount } = await import(pathToFileURL(localePath).href);

  assert.equal(formatGuestCount(0, "ar"), "لا يوجد ضيوف");
  assert.equal(formatGuestCount(1, "ar"), "ضيف واحد");
  assert.equal(formatGuestCount(2, "ar"), "ضيفان");
  assert.equal(formatGuestCount(5, "ar"), "5 ضيوف");
  assert.equal(formatGuestCount(25, "ar"), "25 ضيفاً");
  assert.equal(formatGuestCount(150, "ar"), "150 ضيف");

  assert.equal(formatGuestCount(0, "en"), "0 guests");
  assert.equal(formatGuestCount(1, "en"), "1 guest");
  assert.equal(formatGuestCount(10, "en"), "10 guests");
});

test("formatEventDate enforces explicit Gregorian calendar (F-04) and Latin digits (F-15)", async () => {
  const localePath = path.join(SHARED_ROOT, "src", "utils", "locale.js");
  const { formatEventDate } = await import(pathToFileURL(localePath).href);

  // Fixed civil dates including 25th, 28th, 30th, 31st
  const dates = [
    { iso: "2026-05-25", day: "25", arMonth: "مايو", enMonth: "May" },
    { iso: "2026-05-28", day: "28", arMonth: "مايو", enMonth: "May" },
    { iso: "2026-08-30", day: "30", arMonth: "أغسطس", enMonth: "August" },
    { iso: "2026-08-31", day: "31", arMonth: "أغسطس", enMonth: "August" },
  ];

  for (const item of dates) {
    const ar = formatEventDate(item.iso, "ar");
    const en = formatEventDate(item.iso, "en");

    assert.ok(ar.includes(item.day), `Arabic date must contain Latin day ${item.day}`);
    assert.ok(ar.includes(item.arMonth), `Arabic date must contain Gregorian month ${item.arMonth}`);
    assert.ok(ar.includes("2026"), "Arabic date must contain Latin year 2026");
    assert.ok(!ar.includes("صفر") && !ar.includes("شوال") && !ar.includes("محرم"), "Arabic date must never use Islamic calendar");

    assert.ok(en.includes(item.day), `English date must contain day ${item.day}`);
    assert.ok(en.includes(item.enMonth), `English date must contain month ${item.enMonth}`);
    assert.ok(en.includes("2026"), "English date must contain year 2026");

    // From Date object with UTC midnight
    const dateObj = new Date(`${item.iso}T00:00:00.000Z`);
    assert.equal(formatEventDate(dateObj, "ar"), ar, "Date object at UTC midnight must match civil date string");
  }

  // Null and empty safe fallback
  assert.equal(formatEventDate(null), "");
  assert.equal(formatEventDate(""), "");
  assert.equal(formatEventDate("not-a-date"), "");
});

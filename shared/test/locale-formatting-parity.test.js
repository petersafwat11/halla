import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  formatCount,
  formatPercent,
  formatCurrency,
  normalizeDigits,
  getDatePickerLocale,
} from "../src/utils/locale.js";

describe("PR2R: Canonical Locale Formatting Architecture Parity", () => {
  it("civil dates: strictly validates bare YYYY-MM-DD including leap years and boundary dates", () => {
    // Valid leap day
    const leapDay = formatDate("2024-02-29", "ar");
    assert.ok(leapDay.includes("29"), "Valid leap day must format with 29");
    assert.ok(leapDay.includes("فبراير"), "Valid leap day must format with February in Arabic");

    // Invalid leap day in non-leap year must return empty string
    assert.equal(formatDate("2026-02-29", "ar"), "", "Non-leap year Feb 29 must return empty string");
    assert.equal(formatDate("2026-02-29", "en"), "", "Non-leap year Feb 29 must return empty string");

    // Invalid day boundaries for 30-day month
    assert.equal(formatDate("2026-04-31", "ar"), "", "April 31 is invalid -> empty string");
    assert.equal(formatDate("2026-06-31", "ar"), "", "June 31 is invalid -> empty string");
    assert.equal(formatDate("2026-09-31", "ar"), "", "Sept 31 is invalid -> empty string");
    assert.equal(formatDate("2026-11-31", "ar"), "", "Nov 31 is invalid -> empty string");

    // Invalid months / days
    assert.equal(formatDate("2026-13-01", "ar"), "", "Month 13 is invalid");
    assert.equal(formatDate("2026-00-10", "ar"), "", "Month 0 is invalid");
    assert.equal(formatDate("2026-05-32", "ar"), "", "Day 32 is invalid");
    assert.equal(formatDate("not-a-date", "ar"), "", "Non-date string returns empty string");
    assert.equal(formatDate(null, "ar"), "", "null returns empty string");
    assert.equal(formatDate("", "ar"), "", "empty string returns empty string");

    // Valid 25, 28, 30, 31 dates across year boundaries
    const d25 = formatDate("2026-05-25", "ar");
    assert.ok(d25.includes("25") && d25.includes("مايو"));

    const d28 = formatDate("2026-02-28", "ar");
    assert.ok(d28.includes("28") && d28.includes("فبراير"));

    const d30 = formatDate("2026-04-30", "ar");
    assert.ok(d30.includes("30") && d30.includes("أبريل"));

    const d31 = formatDate("2026-08-31", "ar");
    assert.ok(d31.includes("31") && d31.includes("أغسطس"));

    // Year boundary
    const nye = formatDate("2025-12-31", "en");
    assert.ok(nye.includes("December 31, 2025"));

    const ny = formatDate("2026-01-01", "en");
    assert.ok(ny.includes("January 1, 2026"));
  });

  it("timezones: civil dates NEVER shift across timezones; instants DO shift according to timezone", () => {
    const civilStr = "2026-08-31";

    // Civil date across different requested timezones produces identical day/month/year
    const civilUtc = formatDate(civilStr, "en", { timeZone: "UTC" });
    const civilRiyadh = formatDate(civilStr, "en", { timeZone: "Asia/Riyadh" });
    const civilCairo = formatDate(civilStr, "en", { timeZone: "Africa/Cairo" });
    const civilNY = formatDate(civilStr, "en", { timeZone: "America/New_York" });
    const civilHonolulu = formatDate(civilStr, "en", { timeZone: "Pacific/Honolulu" });

    assert.equal(civilUtc, "August 31, 2026");
    assert.equal(civilRiyadh, "August 31, 2026");
    assert.equal(civilCairo, "August 31, 2026");
    assert.equal(civilNY, "August 31, 2026");
    assert.equal(civilHonolulu, "August 31, 2026");

    // Instants DO shift according to timezone
    // 2026-08-31 22:30:00 UTC is September 1 01:30:00 in Riyadh (UTC+3) and August 31 18:30:00 in NY (UTC-4)
    const instant = new Date("2026-08-31T22:30:00.000Z");
    const instantRiyadh = formatDate(instant, "en", { timeZone: "Asia/Riyadh" });
    const instantNY = formatDate(instant, "en", { timeZone: "America/New_York" });

    assert.ok(instantRiyadh.includes("September 1, 2026"), "Instant must shift to Sept 1 in Riyadh");
    assert.ok(instantNY.includes("August 31, 2026"), "Instant must shift to Aug 31 in New York");
  });

  it("policy override protection: caller attempts to pass islamic calendar or arabic digits cannot change policy", () => {
    const dateStr = "2026-08-31";

    // Attempting to pass calendar: 'islamic' must NOT use Islamic calendar
    const arHijriAttempt = formatDate(dateStr, "ar", { calendar: "islamic" });
    assert.ok(arHijriAttempt.includes("أغسطس"), "Must format with Gregorian August");
    assert.ok(arHijriAttempt.includes("2026"), "Must format with 2026");
    assert.ok(!arHijriAttempt.includes("صفر") && !arHijriAttempt.includes("ربيع"), "Must not contain Islamic months");

    // Attempting to pass numberingSystem: 'arab' must NOT produce Eastern Arabic digits
    const arDigitAttempt = formatDate(dateStr, "ar", { numberingSystem: "arab" });
    assert.ok(arDigitAttempt.includes("31"), "Must use Latin digits 31");
    assert.ok(arDigitAttempt.includes("2026"), "Must use Latin digits 2026");
    assert.ok(!/[\u0660-\u0669]/.test(arDigitAttempt), "Must not contain Eastern Arabic digits");

    // formatNumber override protection
    const numAttempt = formatNumber(1234, "ar", { numberingSystem: "arab" });
    assert.ok(numAttempt.includes("1,234"), "Number must use Latin digits");
    assert.ok(!/[\u0660-\u0669]/.test(numAttempt));

    // formatCurrency override protection
    const currAttempt = formatCurrency(500, "ar", "SAR", { numberingSystem: "arab" });
    assert.ok(currAttempt.includes("500.00"), "Currency must use Latin digits");
    assert.ok(!/[\u0660-\u0669]/.test(currAttempt));

    // formatCount and formatPercent compliance
    assert.equal(formatCount(250, "ar"), "250");
    assert.equal(formatCount(250, "en"), "250");
    assert.equal(formatPercent(15, "ar"), "15٪");
    assert.equal(formatPercent(15, "en"), "15%");
  });

  it("formatDateTime: formats instants with date and time using Latin digits and Gregorian calendar", () => {
    const instant = "2026-08-31T18:30:00.000Z";
    const arDt = formatDateTime(instant, "ar", { timeZone: "UTC" });
    const enDt = formatDateTime(instant, "en", { timeZone: "UTC" });

    assert.ok(arDt.includes("31") && arDt.includes("أغسطس") && arDt.includes("2026"));
    assert.ok(!/[\u0660-\u0669]/.test(arDt), "No Arabic digits in datetime");

    assert.ok(enDt.includes("31") && enDt.includes("August") && enDt.includes("2026"));
  });

  it("formatTime: handles 12/24 hour strings and instants with Latin digits and localized indicators", () => {
    assert.equal(formatTime("6:30 AM", "ar"), "6:30 ص");
    assert.equal(formatTime("6:30 PM", "ar"), "6:30 م");
    assert.equal(formatTime("18:30", "ar"), "6:30 م");
    assert.equal(formatTime("6:30 AM", "en"), "6:30 AM");
    assert.equal(formatTime("18:30", "en"), "6:30 PM");
  });

  it("getDatePickerLocale returns explicit policy locale tags", () => {
    assert.equal(getDatePickerLocale("ar"), "ar-SA-u-ca-gregory-nu-latn");
    assert.equal(getDatePickerLocale("ar-SA"), "ar-SA-u-ca-gregory-nu-latn");
    assert.equal(getDatePickerLocale("en"), "en-US-u-ca-gregory-nu-latn");
    assert.equal(getDatePickerLocale("en-US"), "en-US-u-ca-gregory-nu-latn");
  });

  it("normalizeDigits: normalizes input digits to ASCII without modifying prose", () => {
    assert.equal(normalizeDigits("١٢٣٤٥"), "12345");
    assert.equal(normalizeDigits("السعر ٥٠٠ ريال"), "السعر 500 ريال");
  });
});

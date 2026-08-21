import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatExpiryInput,
  parseCardExpiry,
  validateCardExpiry,
  checkLuhn,
  detectCardBrand,
  buildCreditCardSource,
} from "../src/utils/card.js";

test("formatExpiryInput: formats digits into MM/YY while typing and deleting", () => {
  // Empty
  assert.deepEqual(formatExpiryInput(""), { formatted: "", month: "", year: "" });

  // Single digit
  assert.deepEqual(formatExpiryInput("1"), { formatted: "1", month: "1", year: "" });

  // Two digits typing forward -> appends slash
  assert.deepEqual(formatExpiryInput("12", "1"), { formatted: "12/", month: "12", year: "" });

  // Two digits deleting backward from "12/" -> does NOT re-append slash
  assert.deepEqual(formatExpiryInput("12", "12/"), { formatted: "12", month: "12", year: "" });

  // Three digits
  assert.deepEqual(formatExpiryInput("122", "12/"), { formatted: "12/2", month: "12", year: "" });

  // Four digits -> complete MM/YY with 4-digit year
  assert.deepEqual(formatExpiryInput("1226", "12/2"), { formatted: "12/26", month: "12", year: "2026" });

  // Extra digits truncated to 4 digits
  assert.deepEqual(formatExpiryInput("122699", "12/26"), { formatted: "12/26", month: "12", year: "2026" });
});

test("parseCardExpiry: parses various formats and normalizes 2-digit MM and 4-digit YYYY", () => {
  assert.deepEqual(parseCardExpiry("12/26"), {
    month: "12",
    year: "2026",
    monthNum: 12,
    yearNum: 2026,
    isValidFormat: true,
  });

  assert.deepEqual(parseCardExpiry("05/30"), {
    month: "05",
    year: "2030",
    monthNum: 5,
    yearNum: 2030,
    isValidFormat: true,
  });

  assert.deepEqual(parseCardExpiry("5/26"), {
    month: "05",
    year: "2026",
    monthNum: 5,
    yearNum: 2026,
    isValidFormat: true,
  });

  // Paste with separators
  assert.deepEqual(parseCardExpiry("12 - 26"), {
    month: "12",
    year: "2026",
    monthNum: 12,
    yearNum: 2026,
    isValidFormat: true,
  });

  assert.deepEqual(parseCardExpiry("12.2026"), {
    month: "12",
    year: "2026",
    monthNum: 12,
    yearNum: 2026,
    isValidFormat: true,
  });

  assert.deepEqual(parseCardExpiry("1226"), {
    month: "12",
    year: "2026",
    monthNum: 12,
    yearNum: 2026,
    isValidFormat: true,
  });

  // Object input
  assert.deepEqual(parseCardExpiry({ month: 7, year: 27 }), {
    month: "07",
    year: "2027",
    monthNum: 7,
    yearNum: 2027,
    isValidFormat: true,
  });

  // Invalid / empty
  assert.equal(parseCardExpiry("").isValidFormat, false);
  assert.equal(parseCardExpiry(null).isValidFormat, false);
  assert.equal(parseCardExpiry("00/26").isValidFormat, false);
  assert.equal(parseCardExpiry("13/26").isValidFormat, false);
});

test("validateCardExpiry: enforces 01-12 month bounds and non-expired date against reference date", () => {
  const refDate = new Date(2026, 7, 21); // 2026-08-21 (August 2026)

  // Empty / missing
  assert.deepEqual(validateCardExpiry("", "", refDate), {
    valid: false,
    errorKey: "checkout.errors.expiryRequired",
    errorCode: "EXPIRY_REQUIRED",
  });

  // 00/YY -> Invalid month
  assert.deepEqual(validateCardExpiry("00", "2026", refDate), {
    valid: false,
    errorKey: "checkout.errors.expiryMonthInvalid",
    errorCode: "INVALID_MONTH",
  });

  // 13/YY -> Invalid month
  assert.deepEqual(validateCardExpiry("13", "2026", refDate), {
    valid: false,
    errorKey: "checkout.errors.expiryMonthInvalid",
    errorCode: "INVALID_MONTH",
  });

  // Past month in current year (07/26 when ref is 08/26) -> Expired
  assert.deepEqual(validateCardExpiry("07", "2026", refDate), {
    valid: false,
    errorKey: "checkout.errors.expiryExpired",
    errorCode: "EXPIRED",
  });

  // Current month (08/26 when ref is 08/26) -> VALID (cards valid through end of month)
  assert.deepEqual(validateCardExpiry("08", "2026", refDate), {
    valid: true,
    errorKey: null,
    errorCode: null,
  });

  // Next month in current year (09/26) -> VALID
  assert.deepEqual(validateCardExpiry("09", "2026", refDate), {
    valid: true,
    errorKey: null,
    errorCode: null,
  });

  // Past year (12/25) -> Expired
  assert.deepEqual(validateCardExpiry("12", "2025", refDate), {
    valid: false,
    errorKey: "checkout.errors.expiryExpired",
    errorCode: "EXPIRED",
  });

  // Future year (12/30) -> VALID
  assert.deepEqual(validateCardExpiry("12", "2030", refDate), {
    valid: true,
    errorKey: null,
    errorCode: null,
  });

  // Far future year (> current + 25) -> Invalid year
  assert.deepEqual(validateCardExpiry("12", "2070", refDate), {
    valid: false,
    errorKey: "checkout.errors.expiryExpired",
    errorCode: "INVALID_YEAR",
  });

  // String single argument mode
  assert.equal(validateCardExpiry("00/26", refDate).valid, false);
  assert.equal(validateCardExpiry("13/26", refDate).valid, false);
  assert.equal(validateCardExpiry("07/26", refDate).valid, false);
  assert.equal(validateCardExpiry("08/26", refDate).valid, true);
  assert.equal(validateCardExpiry("12/28", refDate).valid, true);
});

test("checkLuhn & detectCardBrand: correctly validates card number and brands", () => {
  // Brand detection
  assert.equal(detectCardBrand("4061361234567890"), "mada");
  assert.equal(detectCardBrand("4111111111111111"), "visa");
  assert.equal(detectCardBrand("5105105105105100"), "mastercard");
  assert.equal(detectCardBrand(""), "unknown");

  // Luhn algorithm
  assert.equal(checkLuhn("4111111111111111"), true); // Valid Visa test number
  assert.equal(checkLuhn("4111111111111112"), false); // Invalid Luhn
  assert.equal(checkLuhn(""), false);
  assert.equal(checkLuhn("123"), false);
});

test("buildCreditCardSource: generates wire-format source with integer month and year for Moyasar", () => {
  const source = buildCreditCardSource({
    name: " Ahmed Al-Saud ",
    number: "4111 1111 1111 1111",
    month: "08",
    year: "2026",
    cvc: "123",
  });

  assert.deepEqual(source, {
    type: "creditcard",
    name: "Ahmed Al-Saud",
    number: "4111111111111111",
    month: 8,
    year: 2026,
    cvc: "123",
  });
});

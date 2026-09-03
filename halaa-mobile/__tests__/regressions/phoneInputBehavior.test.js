const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizePhoneNumber,
  toE164,
  clampPhoneInput,
  getPhoneMaxLength,
  isValidPhone,
} = require("@halaa/shared/utils/phone");

test("F-01 Mobile Phone: accepts Saudi 10-digit local format (05xxxxxxxx)", () => {
  const input = "0501234567";
  assert.equal(isValidPhone(input), true);
  assert.equal(normalizePhoneNumber(input), "966501234567");
  assert.equal(toE164(input), "+966501234567");
  assert.equal(clampPhoneInput(input), "0501234567");
  assert.equal(getPhoneMaxLength(input), 10);
});

test("F-01 Mobile Phone: accepts Saudi 9-digit local format (5xxxxxxxx)", () => {
  const input = "501234567";
  assert.equal(isValidPhone(input), true);
  assert.equal(normalizePhoneNumber(input), "966501234567");
  assert.equal(toE164(input), "+966501234567");
  assert.equal(clampPhoneInput(input), "501234567");
  assert.equal(getPhoneMaxLength(input), 9);
});

test("F-01 Mobile Phone: accepts Saudi international formats (+9665xxxxxxxx, 9665xxxxxxxx)", () => {
  const intlPlus = "+966501234567";
  const intlBare = "966501234567";
  assert.equal(isValidPhone(intlPlus), true);
  assert.equal(normalizePhoneNumber(intlPlus), "966501234567");
  assert.equal(isValidPhone(intlBare), true);
  assert.equal(normalizePhoneNumber(intlBare), "966501234567");
});

test("F-01 Mobile Phone: converts Eastern Arabic numerals and strips formatting punctuation", () => {
  const arabicDigits = "٠٥٠١٢٣٤٥٦٧";
  assert.equal(isValidPhone(arabicDigits), true);
  assert.equal(normalizePhoneNumber(arabicDigits), "966501234567");
  assert.equal(clampPhoneInput(arabicDigits), "0501234567");

  const formatted = "050-123 4567";
  assert.equal(clampPhoneInput(formatted), "0501234567");
  assert.equal(normalizePhoneNumber(formatted), "966501234567");
});

test("F-01 Mobile Phone: rejects invalid prefixes and lengths", () => {
  assert.equal(isValidPhone("050123456"), false); // 9 digits with 05
  assert.equal(isValidPhone("5012345678"), false); // 10 digits with 5
  assert.equal(isValidPhone("0612345678"), false); // wrong prefix
  assert.equal(isValidPhone(""), false);
});

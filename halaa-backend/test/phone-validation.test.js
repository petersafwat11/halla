/**
 * Central Saudi Phone Rule Engine tests
 *
 * Verifies the single source of truth helpers in src/shared/utils/phone.js
 * against the spec:
 *   - 05XXXXXXXX (10 digits) and 5XXXXXXXX (9 digits) are valid
 *   - International 9665XXXXXXXX / +9665XXXXXXXX are valid
 *   - Eastern Arabic (٠-٩) / Persian (۰-۹) digits convert before validation
 *   - Wrong lengths / wrong prefixes are rejected
 *   - clampPhoneInput enforces real-time typing limits
 *   - getPhoneLookupVariants generates every DB lookup form
 *   - Behavior parity with @halaa/shared/utils/phone (no drift)
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_PHONE_PLACEHOLDER,
  SAUDI_PHONE_REGEX,
  clampPhoneInput,
  getPhoneMaxLength,
  normalizeDigits,
  normalizePhoneNumber,
  toE164,
  validateAndFormatPhone,
  isValidPhone,
  getPhoneLookupVariants,
} = require("../src/shared/utils/phone");

test("DEFAULT_PHONE_PLACEHOLDER is the canonical placeholder", () => {
  assert.equal(DEFAULT_PHONE_PLACEHOLDER, "05xxxxxxxx");
});

test("0501234567 (10 digits) -> valid, normalizes to 966501234567", () => {
  assert.equal(isValidPhone("0501234567"), true);
  assert.equal(normalizePhoneNumber("0501234567"), "966501234567");
});

test("501234567 (9 digits) -> valid, normalizes to 966501234567", () => {
  assert.equal(isValidPhone("501234567"), true);
  assert.equal(normalizePhoneNumber("501234567"), "966501234567");
});

test("٠٥٠١٢٣٤٥٦٧ (Arabic 10 digits) -> valid, converts & normalizes", () => {
  assert.equal(isValidPhone("٠٥٠١٢٣٤٥٦٧"), true);
  assert.equal(normalizePhoneNumber("٠٥٠١٢٣٤٥٦٧"), "966501234567");
});

test("٥٠١٢٣٤٥٦٧ (Arabic 9 digits) -> valid, converts & normalizes", () => {
  assert.equal(isValidPhone("٥٠١٢٣٤٥٦٧"), true);
  assert.equal(normalizePhoneNumber("٥٠١٢٣٤٥٦٧"), "966501234567");
});

test("international formats normalize to canonical digits", () => {
  assert.equal(normalizePhoneNumber("+966501234567"), "966501234567");
  assert.equal(normalizePhoneNumber("966501234567"), "966501234567");
  assert.equal(toE164("0501234567"), "+966501234567");
});

test("050123456 (9 digits starting with 05) -> invalid", () => {
  assert.equal(isValidPhone("050123456"), false);
  assert.equal(SAUDI_PHONE_REGEX.test("050123456"), false);
});

test("5012345678 (10 digits starting with 5) -> invalid", () => {
  assert.equal(isValidPhone("5012345678"), false);
  assert.equal(SAUDI_PHONE_REGEX.test("5012345678"), false);
});

test("0101234567 (10 digits not starting with 05) -> invalid", () => {
  assert.equal(isValidPhone("0101234567"), false);
});

test("06/07 prefixes and short garbage are rejected", () => {
  assert.equal(isValidPhone("0612345678"), false);
  assert.equal(isValidPhone("0712345678"), false);
  assert.equal(isValidPhone("12345"), false);
  assert.equal(isValidPhone(""), false);
  assert.equal(isValidPhone(null), false);
});

test("validateAndFormatPhone returns SA metadata for valid numbers", () => {
  const res = validateAndFormatPhone("050-123-4567");
  assert.equal(res.isValid, true);
  assert.equal(res.country, "SA");
  assert.equal(res.e164, "+966501234567");
});

test("clampPhoneInput enforces real-time typing clamps", () => {
  // local 05 prefix clamps at 10
  assert.equal(clampPhoneInput("05012345678"), "0501234567");
  // bare 5 prefix clamps at 9
  assert.equal(clampPhoneInput("5012345678"), "501234567");
  // non-digit junk stripped
  assert.equal(clampPhoneInput("(050) 123-4567x99"), "0501234567");
  // Arabic digits converted then clamped
  assert.equal(clampPhoneInput("٠٥٠١٢٣٤٥٦٧٨٩"), "0501234567");
  assert.equal(clampPhoneInput("۵۰۱۲۳۴۵۶۷"), "501234567");
  // null-safe
  assert.equal(clampPhoneInput(null), "");
  assert.equal(clampPhoneInput(undefined), "");
});

test("getPhoneMaxLength returns dynamic input limits", () => {
  assert.equal(getPhoneMaxLength(""), 10);
  assert.equal(getPhoneMaxLength("0"), 10);
  assert.equal(getPhoneMaxLength("05"), 10);
  assert.equal(getPhoneMaxLength("5"), 9);
  assert.equal(getPhoneMaxLength("50"), 9);
  assert.equal(getPhoneMaxLength("٠٥"), 10);
  assert.equal(getPhoneMaxLength("٥"), 9);
});

test("normalizeDigits converts Eastern Arabic & Persian numerals", () => {
  assert.equal(normalizeDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
  assert.equal(normalizeDigits("۰۱۲۳۴۵۶۷۸۹"), "0123456789");
  assert.equal(normalizeDigits("abc٠5"), "abc05");
});

test("getPhoneLookupVariants covers every stored representation", () => {
  const fromLocal = getPhoneLookupVariants("0501234567");
  for (const v of ["966501234567", "+966501234567", "501234567", "0501234567"]) {
    assert.ok(fromLocal.includes(v), `missing variant ${v}`);
  }

  const fromBare = getPhoneLookupVariants("501234567");
  for (const v of ["966501234567", "+966501234567", "501234567", "0501234567"]) {
    assert.ok(fromBare.includes(v), `missing variant ${v}`);
  }

  const fromIntl = getPhoneLookupVariants("+966501234567");
  for (const v of ["966501234567", "+966501234567", "501234567", "0501234567"]) {
    assert.ok(fromIntl.includes(v), `missing variant ${v}`);
  }

  assert.deepEqual(getPhoneLookupVariants(""), []);
  assert.deepEqual(getPhoneLookupVariants(null), []);
});

test("parity: backend copy matches @halaa/shared behavior (no drift)", async () => {
  const shared = await import("@halaa/shared/utils/phone");

  const samples = [
    "0501234567",
    "501234567",
    "+966501234567",
    "966501234567",
    "٠٥٠١٢٣٤٥٦٧",
    "050123456",
    "0101234567",
    "",
    null,
  ];

  for (const s of samples) {
    assert.equal(
      shared.isValidPhone(s),
      isValidPhone(s),
      `isValidPhone drift for ${s}`
    );
    assert.equal(
      shared.normalizePhoneNumber(s),
      normalizePhoneNumber(s),
      `normalizePhoneNumber drift for ${s}`
    );
    assert.equal(
      shared.clampPhoneInput(s),
      clampPhoneInput(s),
      `clampPhoneInput drift for ${s}`
    );
    assert.deepEqual(
      shared.getPhoneLookupVariants(s),
      getPhoneLookupVariants(s),
      `getPhoneLookupVariants drift for ${s}`
    );
  }

  assert.equal(shared.DEFAULT_PHONE_PLACEHOLDER, DEFAULT_PHONE_PLACEHOLDER);
  assert.equal(String(shared.SAUDI_PHONE_REGEX), String(SAUDI_PHONE_REGEX));
});

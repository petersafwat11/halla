const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { isValidSaudiMobile } = require("@halaa/shared/utils/phone");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(MOBILE_ROOT, p), "utf8");

const MOBILE_INPUT = "components/commen/MobileInput.js";
const ADD_BUSINESS_MODAL = "components/admin-dashboard/businesses/AddBusinessModal.js";

/**
 * Regression: creating a business account failed with an opaque error when the
 * phone number was 8 digits instead of 9. The field only checked emptiness, so
 * a malformed number reached the backend and came back as a generic 400. Web's
 * AddBusinessPopup had the same gap; this locks the mobile half.
 */

test("Business create: an 8-digit local number is not a valid Saudi mobile", () => {
  // The exact input that triggered the report.
  assert.equal(isValidSaudiMobile("51234567"), false);
  // 9-digit local and 10-digit 05 forms stay valid.
  assert.equal(isValidSaudiMobile("512345678"), true);
  assert.equal(isValidSaudiMobile("0512345678"), true);
  assert.equal(isValidSaudiMobile("+966512345678"), true);
});

test("MobileInput: validates the Saudi mobile shape, not just emptiness", () => {
  const src = read(MOBILE_INPUT);

  assert.match(src, /isValidSaudiMobile/, "must validate the Saudi mobile shape");
  assert.match(src, /validation\.invalidSaudiPhone/, "must show a localized message");
  assert.match(
    src,
    /rules=\{mergedRules\}/,
    "Controller must receive the merged rules, not the caller's alone"
  );
  // A caller passing `validate` as a bare function must not be dropped by the
  // object spread that adds the shape check.
  assert.match(src, /typeof rules\?\.validate === "function"/);
});

test("AddBusinessModal: field rules mirror the backend createBusinessSchema", () => {
  const src = read(ADD_BUSINESS_MODAL);

  // name: min 2 / max 100
  assert.match(src, /minLength:\s*\{\s*value:\s*2/);
  assert.match(src, /maxLength:\s*\{\s*value:\s*100/);
  // email: format, not just presence
  assert.match(src, /validation\.invalidEmail/);
  // password: optional, but bounded 8..128 when provided
  assert.match(src, /validation\.passwordMinLength/);
  assert.match(src, /validation\.passwordMaxLength/);
});

test("AddBusinessModal: reports errors through the canonical presenter", () => {
  const src = read(ADD_BUSINESS_MODAL);

  assert.match(src, /presentError/, "must use the shared error presenter");
  assert.match(src, /formatErrorDisplay/);
  assert.doesNotMatch(
    src,
    /toast\.error\(error\.message/,
    "raw backend text must not be surfaced to the user"
  );
  // Backend field errors must land on the inputs that caused them.
  assert.match(src, /methods\.setError\(issue\.field/);
});

test("AddBusinessModal: every validation message key resolves in both locales", () => {
  const keys = [
    "nameMin",
    "nameMax",
    "invalidEmail",
    "invalidSaudiPhone",
    "passwordMinLength",
    "passwordMaxLength",
  ];
  for (const lang of ["ar", "en"]) {
    const common = JSON.parse(read(`localization/locales/${lang}/common.json`));
    for (const key of keys) {
      assert.ok(
        common.validation?.[key],
        `${lang} common.validation.${key} is missing`
      );
    }
  }
});

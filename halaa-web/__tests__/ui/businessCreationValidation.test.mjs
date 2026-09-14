import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyServerFieldErrors } from "../../services/errorHandlingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(WEB_ROOT, p), "utf8");

const INPUT_GROUP = "ui/commen/inputs/inputGroup/InputGroup.js";
const MOBILE_INPUT_GROUP = "ui/commen/inputs/mobileInputGroup/MobileInputGroup.js";
const ADD_BUSINESS_POPUP =
  "app/[lang]/admin-dash/businesses/_components/AddBusinessPopup.jsx";

/**
 * Regression: creating a business account failed with only the generic
 * "check the entered data" toast and no inline hint, because a required field
 * left empty was never blocked in the browser and the backend's field-level
 * errors were discarded by the client.
 */

test("InputGroup: `required` registers a validation rule, not just the asterisk", () => {
  const src = read(INPUT_GROUP);

  // The asterisk must be backed by a real react-hook-form rule.
  assert.match(src, /registerRules\.required\s*=/);
  assert.match(
    src,
    /register\(name,\s*registerRules\)/,
    "register() must receive the computed rules"
  );
  assert.doesNotMatch(
    src,
    /:\s*register\s*\?\s*register\(name\)\s*:/,
    "register() must no longer be called without rules"
  );

  // Whitespace-only input must not satisfy `required`.
  assert.match(src, /notBlank/);
});

test("MobileInputGroup: rejects half-typed Saudi numbers before submitting", () => {
  const src = read(MOBILE_INPUT_GROUP);

  assert.match(src, /isValidSaudiMobile/, "must validate the Saudi mobile shape");
  assert.doesNotMatch(
    src,
    /"This field is required"/,
    "the required message must be localized, not a hardcoded English string"
  );
  assert.match(src, /t\("validation\.required"\)/);
});

test("AddBusinessPopup: never posts an empty phoneNumber", () => {
  const src = read(ADD_BUSINESS_POPUP);

  // The backend `createBusinessSchema` requires phoneNumber (min 7 chars), so
  // an empty toE164() result must be caught client-side instead of posted.
  assert.doesNotMatch(
    src,
    /formData\.append\("phoneNumber",\s*toE164\(/,
    "toE164() result must be guarded before it is appended"
  );
  assert.match(src, /if \(!phoneNumber\)/);
  assert.match(src, /setError\("phoneNumber"/);

  // Client rules must mirror the backend schema bounds.
  assert.match(src, /minLength:\s*\{\s*value:\s*2/);
  assert.match(src, /maxLength:\s*\{\s*value:\s*100/);
  assert.match(src, /applyServerFieldErrors\(error,\s*methods\.setError/);
});

test("applyServerFieldErrors: pins backend validation errors to their inputs", () => {
  const applied = [];
  const setError = (field, opts) => applied.push([field, opts.message, opts.type]);

  // Shape produced by the backend ValidationError for a missing phoneNumber.
  const error = {
    response: {
      status: 400,
      data: {
        code: "VALIDATION_ERROR",
        message: "phoneNumber: Required",
        errors: [
          { field: "phoneNumber", message: "Required", code: "invalid_type" },
          {
            field: "name",
            message: "String must contain at least 2 character(s)",
            code: "too_small",
          },
        ],
      },
    },
  };

  const fields = applyServerFieldErrors(error, setError, {
    t: (key) => (key === "validation.required" ? "هذا الحقل مطلوب" : key),
  });

  assert.deepEqual(fields, ["phoneNumber", "name"]);
  // `invalid_type` has a localized equivalent that needs no interpolation.
  assert.deepEqual(applied[0], ["phoneNumber", "هذا الحقل مطلوب", "server"]);
  // `too_small` keeps the server text, which names the actual limit.
  assert.deepEqual(applied[1], [
    "name",
    "String must contain at least 2 character(s)",
    "server",
  ]);
});

test("applyServerFieldErrors: falls back to fieldErrors and tolerates no setError", () => {
  const applied = [];
  const error = {
    response: {
      status: 400,
      data: {
        code: "VALIDATION_ERROR",
        fieldErrors: { email: "Invalid email" },
      },
    },
  };

  const fields = applyServerFieldErrors(error, (field, opts) =>
    applied.push([field, opts.message])
  );
  assert.deepEqual(fields, ["email"]);
  assert.deepEqual(applied, [["email", "Invalid email"]]);

  // A caller without a form must not throw.
  assert.deepEqual(applyServerFieldErrors(error, undefined), []);
});

test("applyServerFieldErrors: highlights the colliding field on a 409 conflict", () => {
  const applied = [];
  // Shape produced by the backend ConflictError for a duplicate account.
  const error = {
    response: {
      status: 409,
      data: {
        code: "CONFLICT",
        message: "Email already exists",
        field: "email",
      },
    },
  };

  const fields = applyServerFieldErrors(error, (field, opts) =>
    applied.push([field, opts.message])
  );

  assert.deepEqual(fields, ["email"]);
  // A 409 now presents as a conflict rather than a retryable server error.
  assert.match(applied[0][1], /تتعارض البيانات/);
});

test("common locale: length validation copy exists in both languages", () => {
  for (const lang of ["ar", "en"]) {
    const common = JSON.parse(read(`localization/locales/${lang}/common.json`));
    assert.ok(common.validation.minLength.includes("{{count}}"), `${lang} minLength`);
    assert.ok(common.validation.maxLength.includes("{{count}}"), `${lang} maxLength`);
    assert.ok(common.validation.required, `${lang} required`);
    assert.ok(common.validation.invalidSaudiPhone, `${lang} invalidSaudiPhone`);
  }
});

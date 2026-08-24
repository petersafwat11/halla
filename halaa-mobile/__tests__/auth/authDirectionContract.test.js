const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Auth family iOS direction contract (role selection, login, signup — host
 * and vendor — forgot/reset password, complete profile).
 * docs/implementation/HOST_IOS_DIRECTION_BLUEPRINT.md §5 (field contract),
 * §6 (text/BiDi rules), §7 (icon rules), §8 (forced password gates),
 * §9 (migration targets), §11 (verification matrix).
 *
 * Source-reading assertions follow the existing direction-contract
 * conventions in this repository.
 */
const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

const AUTH_TREE = [
  "components/auth/RoleSelectionView.js",
  "components/auth/FormHeader.js",
  "components/auth/EmailLoginForm.js",
  "components/auth/MobileLoginForm.js",
  "components/auth/SignupMobileForm.js",
  "components/auth/OTPVerificationForm.js",
  "components/auth/ForgetPasswordForm.js",
  "components/auth/EmailSentView.js",
  "components/auth/CompleteProfileForm.js",
  "screens/auth/LoginScreen.js",
  "screens/auth/SignupScreen.js",
  "screens/auth/ForgetPasswordScreen.js",
  "screens/auth/ResetPasswordScreen.js",
  "screens/auth/CompleteProfileScreen.js",
  "screens/host/ForcePasswordChangeScreen.js",
];

const VENDOR_STEPS = [
  "components/auth/vendor-signup/VendorStep1Identity.js",
  "components/auth/vendor-signup/VendorStep2ServiceData.js",
  "components/auth/vendor-signup/VendorStep3SamplesPackages.js",
  "components/auth/vendor-signup/VendorStep4CommercialVerification.js",
  "components/auth/vendor-signup/VendorStep5SocialLinks.js",
  "components/auth/vendor-signup/VendorStep6Summary.js",
];

test("auth tree: localized chrome, no Arabic literals, no physical direction bypasses", () => {
  for (const rel of AUTH_TREE.concat(VENDOR_STEPS)) {
    const source = read(rel);

    assert.ok(
      !source.includes("row-reverse"),
      `${rel} must not use flexDirection: row-reverse`
    );
    assert.ok(
      !/[\u0600-\u06FF]/.test(source),
      `${rel} must not embed direct Arabic UI literals — use translation keys`
    );
    assert.ok(
      !/\bisRTL\s*\?\s*["'](left|right)["']/.test(source),
      `${rel} must not branch text alignment on isRTL (logical styles only)`
    );
  }
});

// Forms that render exclusively through shared primitives (FormHeader,
// Email/Mobile/Password inputs, Button) have no direct copy of their own.
const SHARED_ONLY_FORMS = new Set([
  "components/auth/EmailLoginForm.js",
  "components/auth/MobileLoginForm.js",
  "components/auth/SignupMobileForm.js",
  "components/auth/CompleteProfileForm.js",
]);

test("auth tree: every screen renders its copy through LocalizedText or shared primitives", () => {
  for (const rel of AUTH_TREE.concat(VENDOR_STEPS)) {
    const source = read(rel);
    if (SHARED_ONLY_FORMS.has(rel)) {
      assert.match(
        source,
        /<FormHeader/,
        `${rel} delegates headings to the shared localized FormHeader`
      );
      continue;
    }
    assert.ok(
      source.includes("LocalizedText"),
      `${rel} must render application copy through the localized text-role`
    );
  }
});

test("RoleSelectionView: directional chevron and logical card anatomy preserved", () => {
  const source = read("components/auth/RoleSelectionView.js");

  assert.match(source, /<DirectionalIonicon\s+name="chevron-forward"/, "the card chevron mirrors with the locale");
  assert.match(source, /borderStartWidth: 3/, "role-card accent uses a logical start border");
  assert.match(source, /marginEnd: 10/, "icon box spacing is logical end");
  // home/storefront/layers glyphs are semantic — the chevron is the only
  // directional wrapper (import + module path + single JSX usage).
  const usages = (source.match(/<DirectionalIonicon/g) || []).length;
  assert.equal(usages, 1, "only the navigation chevron is direction-wrapped");
});

test("LoginScreen: no inline Arabic fallback literals remain in t() calls", () => {
  const source = read("screens/auth/LoginScreen.js");
  assert.doesNotMatch(source, /t\("[^"]+",\s*"[^"]*[\u0600-\u06FF][^"]*"\)/, "second-argument Arabic defaults are removed — keys resolve from the bundles");
});

test("OTPVerificationForm: phone + cooldown interpolate through isolated LTR tokens", () => {
  const source = read("components/auth/OTPVerificationForm.js");

  assert.ok(source.includes("isolateLtr"), "LTR tokens inside localized sentences need BiDi isolation");
  assert.match(
    source,
    /t\("otp\.descriptionWithPhone",\s*\{[\s\S]*?isolateLtr\(phoneNumber\)[\s\S]*?\}\)/,
    "phone renders via one interpolated sentence, never JSX concatenation"
  );
  assert.match(
    source,
    /t\("otp\.resendIn",\s*\{[\s\S]*?isolateLtr\(timer\)[\s\S]*?\}\)/,
    "cooldown seconds render via one interpolated sentence"
  );
  assert.ok(!source.includes("`${timer}`"), "no template-built countdown strings");
  assert.ok(!/\}\s*\{t\(/.test(source), "no adjacent JSX runs concatenating sentence fragments");
});

test("password gates: shared PasswordInput shell replaces local label/input/error markup", () => {
  for (const rel of ["screens/auth/ResetPasswordScreen.js", "screens/host/ForcePasswordChangeScreen.js"]) {
    const source = read(rel);

    assert.match(
      source,
      /import\s+\{\s*Button,\s*PasswordInput\s*\}\s+from "\.\.\/\.\.\/components\/commen"/,
      `${rel} imports the shared field primitives`
    );
    assert.ok(source.includes("<PasswordInput"), `${rel} renders its secret fields through the shared shell`);
    assert.ok(!source.includes("DirectionalTextInput"), `${rel} must not hand-roll native inputs`);
    assert.ok(!/styles\.label|styles\.inputError|styles\.errorText/.test(source), `${rel} has no local label/error style duplicates`);
    assert.ok(source.includes("FormProvider"), `${rel} binds fields through react-hook-form like the rest of auth`);
    assert.ok(source.includes("LocalizedText"), `${rel} headings/body follow the UI locale`);
  }
});

test("CompleteProfileForm: full name is adaptive user content", () => {
  const source = read("components/auth/CompleteProfileForm.js");
  assert.match(
    source,
    /name="fullName"[\s\S]{0,220}contentDirection="adaptive"/,
    "full name resolves first-strong (Latin value stays LTR inside Arabic UI)"
  );
});

test("vendor signup steps: explicit content modes per field class", () => {
  const step1 = read(VENDOR_STEPS[0]);
  const count = (src, needle) => src.split(needle).length - 1;

  // Step 1 — identity
  assert.equal(count(step1, 'contentDirection="adaptive"'), 2, "brand name + owner name are adaptive");
  assert.ok(step1.includes('label={t(\'signupForm.vendor.identity.brandName.label\')}'), "nested label objects are read via .label subkeys");
  assert.ok(step1.includes('EmailInput') && step1.includes('MobileInput') && step1.includes('PasswordInput'), "email/phone/password stay on their intrinsic shared primitives");

  // Step 2 — service data
  const step2 = read(VENDOR_STEPS[1]);
  assert.equal(count(step2, 'contentDirection="rtl"'), 2, "taglineAr/aboutAr are contractually Arabic-only");
  assert.equal(count(step2, 'contentDirection="ltr"'), 2, "taglineEn/aboutEn are contractually English-only");
  assert.match(step2, /serviceDescription"[\s\S]{0,240}contentDirection="adaptive"/, "free description is adaptive");
  assert.match(step2, /otherData"[\s\S]{0,240}contentDirection="adaptive"/, "extra info is adaptive");

  // Step 4 — canonical IDs
  const step4 = read(VENDOR_STEPS[3]);
  assert.equal(count(step4, 'contentDirection="ltr"'), 2, "commercial record + national ID digits are stable LTR tokens");
  assert.ok(step4.includes('nationalId.label'), "national ID label reads the .label subkey");

  // Step 5 — links
  const step5 = read(VENDOR_STEPS[4]);
  assert.ok(step5.includes('contentDirection="phone"'), "WhatsApp keeps localized placeholder → LTR digits");
  assert.equal(count(step5, 'contentDirection="ltr"'), 5, "every social URL is intrinsically LTR");
});

test("VendorStep6Summary: values are AdaptiveText; alignment is logical, not locale-branched", () => {
  const source = read(VENDOR_STEPS[5]);

  assert.match(source, /<AdaptiveText[^>]*summaryStyles\.value/, "summary values follow their own first-strong direction");
  assert.ok(source.includes("AdaptiveText"), "AdaptiveText primitive is used for backend/user content");
  assert.ok(!source.includes("textAlign"), "no physical alignment overrides remain in the summary rows");
});

test("shared inputs feed raw values into the field-direction resolver (adaptive recompute)", () => {
  for (const rel of ["components/commen/TextInput.js", "components/commen/TextAreaInput.js"]) {
    const source = read(rel);
    assert.match(
      source,
      /useFieldDirection\(contentDirection,\s*\{[\s\S]*?\bvalue\b\s*[:,]/,
      `${rel} must pass the raw value so adaptive mode recomputes first-strong on change`
    );
  }
});

test("MultiImageInput: picker chrome is fully localized with labelled icon actions", () => {
  const source = read("components/commen/MultiImageInput.js");

  assert.ok(!/[\u0600-\u06FF]/.test(source), "no Arabic literals in the shared picker");
  assert.match(source, /t\("imagePicker\.add"\)/, "add-more caption comes from common.json");
  assert.match(source, /imagePicker\.chooseImages|imagePicker\.chooseImage/, "empty-state placeholder comes from common.json");
  assert.match(source, /accessibilityLabel=\{t\("buttons\.delete"\)\}/, "icon-only remove action needs a localized accessibility label");
  assert.match(source, /LocalizedText role="error"/, "validation copy follows the UI locale");
});

test("SignupStepper: localized labels with LTR step-number glyphs", () => {
  const source = read("components/commen/SignupStepper.js");
  assert.ok(source.includes("LocalizedText"), "step labels are app copy");
  assert.match(source, /circleText:\s*\{[^}]*writingDirection:\s*"ltr"/s, "step-number glyphs stay pinned LTR under RTL");
  assert.ok(source.includes("center"), "labels keep centered alignment without physical textAlign right/left");
});

test("locale bundles: OTP interpolation keys exist with balanced isolates; AR chrome is Arabic", () => {
  const ar = JSON.parse(read("localization/locales/ar/auth.json"));
  const en = JSON.parse(read("localization/locales/en/auth.json"));

  for (const key of ["descriptionWithPhone", "resendIn"]) {
    assert.ok(ar.otp[key], `ar otp.${key} exists`);
    assert.ok(en.otp[key], `en otp.${key} exists`);
  }
  assert.match(en.otp.descriptionWithPhone, /\{\{phone\}\}/);
  assert.match(ar.otp.descriptionWithPhone, /\{\{phone\}\}/);
  assert.match(ar.otp.resendIn, /\{\{seconds\}\}/);

  const arCommon = JSON.parse(read("localization/locales/ar/common.json"));
  const enCommon = JSON.parse(read("localization/locales/en/common.json"));
  for (const key of ["add", "chooseImages", "chooseImage", "multipleHint"]) {
    assert.ok(arCommon.imagePicker?.[key], `ar common.imagePicker.${key} exists`);
    assert.ok(enCommon.imagePicker?.[key], `en common.imagePicker.${key} exists`);
  }

  // The vendor labels touched by this remediation must be Arabic-script in AR.
  const vendorIdentity = ar.signupForm.vendor.identity;
  assert.match(vendorIdentity.brandName.label, /[\u0600-\u06FF]/, "AR brand-name label is Arabic");
  assert.match(vendorIdentity.ownerFullName.label, /[\u0600-\u06FF]/, "AR owner-name label is Arabic");
  assert.match(vendorIdentity.email.label, /[\u0600-\u06FF]/, "AR email label is Arabic");
  assert.match(vendorIdentity.password.label, /[\u0600-\u06FF]/, "AR password label is Arabic");
  assert.match(vendorIdentity.passwordConfirm.label, /[\u0600-\u06FF]/, "AR confirm-password label is Arabic");
  assert.match(ar.signupForm.vendor.commercialVerification.nationalId.label, /[\u0600-\u06FF]/, "AR national-ID label is Arabic");
  for (const value of Object.values(ar.signupForm.vendor.steps)) {
    assert.match(value, /[\u0600-\u06FF]/, `AR stepper label "${value}" is Arabic`);
  }
});

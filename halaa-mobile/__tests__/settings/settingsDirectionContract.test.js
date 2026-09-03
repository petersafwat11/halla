const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const SHARED_ROOT = path.resolve(MOBILE_ROOT, "..", "shared");
const read = (rel) =>
  fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");
const readShared = (rel) =>
  fs.readFileSync(path.join(SHARED_ROOT, rel), "utf8");

// Host settings tree under remediation (blueprint §8): settings menu,
// account settings (+ email verification, business profile), and
// notification settings.
const SETTINGS_TREE = [
  "screens/host/SettingsScreen.js",
  "components/settings/SettingsTabs.js",
  "components/settings/DeleteAccountSection.js",
  "screens/host/AccountSettingsScreen.js",
  "components/settings/AccountSettings.js",
  "components/settings/_components/EmailVerificationSection.js",
  "components/settings/BusinessSettings.js",
  "screens/common/NotificationSettingsScreen.js",
  "components/settings/NotificationSettings.js",
];

test("settings tree keeps normal logical rows and never introduces row-reverse", () => {
  for (const rel of SETTINGS_TREE) {
    const source = read(rel);
    assert.ok(
      !source.includes("row-reverse"),
      `${rel} must not use flexDirection: row-reverse`
    );
    assert.ok(
      !/\bleft:\s*\d|right:\s*\d/.test(source),
      `${rel} must anchor semantic actions logically (start/end), not physically`
    );
  }
});

test("settings tree contains no direct native TextInput bypass", () => {
  const allowedPrimitives = /DirectionalTextInput|TextInput\.js/;
  for (const rel of SETTINGS_TREE) {
    const source = read(rel);
    if (rel === "components/settings/DeleteAccountSection.js") {
      // The deletion sheet legitimately uses the shared low-level primitive
      // (non react-hook-form controlled fields).
      assert.ok(source.includes("DirectionalTextInput"));
      continue;
    }
    assert.ok(
      !/"react-native"/.test(source) ||
        !/import\s+\{[^}]*\bTextInput\b[^}]*\}\s+from\s+"react-native"/.test(source),
      `${rel} must not import the native TextInput directly`
    );
    assert.ok(
      !allowedPrimitives.test(source) || !/<TextInput[\s/>]/.test(source),
      `${rel} must render inputs through shared primitives only`
    );
  }
});

test("settings tree renders visible copy through localized role primitives", () => {
  for (const rel of [
    "components/settings/SettingsTabs.js",
    "components/settings/DeleteAccountSection.js",
    "components/settings/AccountSettings.js",
    "components/settings/_components/EmailVerificationSection.js",
    "components/settings/BusinessSettings.js",
    "components/settings/NotificationSettings.js",
  ]) {
    const source = read(rel);
    assert.ok(
      source.includes("LocalizedText"),
      `${rel} must use LocalizedText for app-authored copy`
    );
    assert.ok(
      !/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s+from\s+"react-native"/.test(source),
      `${rel} must not keep plain Text imports that bypass localized roles`
    );
    // Direct Arabic UI literals would bypass i18n (blueprint §6); copy may
    // only appear inside comments.
    const withoutComments = source
      .replace(/\{\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return !trimmed.startsWith("//") && !trimmed.startsWith("*");
      })
      .join("\n");
    assert.ok(
      !/[\u0600-\u06FF]/.test(withoutComments),
      `${rel} must not hardcode Arabic UI literals`
    );
  }
});

test("AccountSettings: single identity field — full name is adaptive, no separate username input", () => {
  const source = read("components/settings/AccountSettings.js");

  assert.match(
    source,
    /name="name"[\s\S]*?contentDirection="adaptive"/,
    "full name is arbitrary user content → adaptive (placeholder locale, value first-strong)"
  );
  assert.ok(
    !source.includes('name="username"'),
    "the legacy username handle must not render as its own input"
  );
  assert.match(source, /user\?\.name/, "name is bound");

  // Validation errors are resolved through the localized schema factory so
  // they always follow the UI locale, never the value's script.
  assert.match(
    source,
    /zodResolver\(accountSettingsSchema\(t\)\)/,
    "schema messages must be translated through t()"
  );
});

test("EmailVerificationSection: badge/action copy is localized; email + OTP remain LTR tokens", () => {
  const section = read("components/settings/_components/EmailVerificationSection.js");

  // Email field comes from the shared EmailInput (ltr contract).
  assert.ok(section.includes("EmailInput"), "email uses the shared ltr input");
  assert.match(section, /<OTPInput[\s\S]*?value=\{verificationCode\}/);
  assert.match(section, /onChangeText=\{setVerificationCode\}/);

  // The verified badge row keeps its semantic leading icon and localized text.
  assert.match(section, /checkmark-circle[\s\S]*LocalizedText/);
});

test("OTPInput supports controlled usage so callers cannot bypass the shared primitive", () => {
  const otp = read("components/commen/OTPInput.js");

  assert.match(otp, /value !== undefined \|\| onChangeText !== undefined/);
  assert.ok(
    otp.includes("LocalizedText"),
    "OTP error chrome must follow the UI locale"
  );
  // Digits themselves stay LTR inside the boxes.
  assert.match(otp, /writingDirection:\s*"ltr"/);
});

test("BusinessSettings migrates to the shared field shell with an adaptive description", () => {
  const business = read("components/settings/BusinessSettings.js");

  assert.ok(business.includes("FormField"), "description uses the shared non-form shell");
  assert.match(
    business,
    /contentDirection="adaptive"/,
    "business description is arbitrary user content → adaptive"
  );
  assert.match(business, /maxLength=\{2000\}/);
  assert.match(business, /showCounter/, "counter stays LTR-isolated at the logical end");
  assert.ok(
    !business.includes("DirectionalTextInput"),
    "no local native input shell may bypass FormField"
  );
});

test("ToggleInput labels/descriptions apply the shared field-direction contract", () => {
  const toggle = read("components/commen/ToggleInput.js");
  assert.ok(toggle.includes("useFieldDirection"));
  assert.match(toggle, /fieldDirection\.text/);
});

test("notification preferences screen loads errors through locale keys", () => {
  const screen = read("screens/common/NotificationSettingsScreen.js");
  assert.match(screen, /t\("notifications\.loadError"\)/);
  assert.ok(
    !/loadError",\s*"/.test(screen),
    "English fallback literal must not shadow the translation"
  );
});

test("locale bundles carry the new keys with AR/EN parity", () => {
  const enCommon = JSON.parse(read("localization/locales/en/common.json"));
  const arCommon = JSON.parse(read("localization/locales/ar/common.json"));
  assert.ok(enCommon.validation.newPasswordRequired);
  assert.ok(arCommon.validation.newPasswordRequired);

  const enSettings = JSON.parse(read("localization/locales/en/settings.json"));
  const arSettings = JSON.parse(read("localization/locales/ar/settings.json"));
  assert.equal(typeof enSettings.notifications.loadError, "string");
  assert.equal(typeof arSettings.notifications.loadError, "string");
  assert.equal(typeof enSettings.account.profileSavedPasswordFailed, "string");
  assert.equal(typeof arSettings.account.profileSavedPasswordFailed, "string");
  assert.equal(typeof enSettings.account.passwordSavedProfileFailed, "string");
  assert.equal(typeof arSettings.account.passwordSavedProfileFailed, "string");
});

test("mobileAccountSettingsSchema resolves opaque keys through t() and keeps raw keys by default", () => {
  const { mobileAccountSettingsSchema } = require(path.join(
    SHARED_ROOT,
    "src",
    "schemas",
    "settings.js"
  ));

  const result = mobileAccountSettingsSchema((key) => `«${key}»`).safeParse({
        name: "علي",
    email: "ahmed@example.com",
    currentPassword: "",
    newPassword: "NewPassword123",
    confirmPassword: "",
  });
  assert.equal(result.success, false);
  const issue = result.error.issues.find((i) => i.path.includes("currentPassword"));
  assert.equal(issue.message, "«validation.currentPasswordRequired»");

  const raw = mobileAccountSettingsSchema().safeParse({
        name: "",
    email: "bad",
  });
  assert.equal(raw.success, false);
  assert.deepEqual(
    raw.error.issues.map((i) => i.message).sort(),
    ["validation.emailInvalid", "validation.nameMin"]
  );
});

test("adaptive value policy matches the blueprint examples used by these fields", async () => {
  // The hook imports the app localization provider (React/RN), which is
  // not importable under plain Node; strip that import and load the pure
  // resolvers from a temp copy (same harness as inputDirection.test.js).
  const hookPath = path.join(MOBILE_ROOT, "hooks", "useInputDirection.js");
  const source = fs
    .readFileSync(hookPath, "utf8")
    .replace(/^import .*localization.*\r?\n/m, "");
  const os = require("node:os");
  const { pathToFileURL } = require("node:url");
  const tmp = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "halla-settings-dir-")),
    "useInputDirection.testable.mjs"
  );
  fs.writeFileSync(tmp, source, "utf8");
  const { resolveStrongDirection } = await import(pathToFileURL(tmp).href);

  assert.equal(resolveStrongDirection("Ali", true), "ltr");
  assert.equal(resolveStrongDirection("علي", false), "rtl");
  assert.equal(resolveStrongDirection("Halaa 2026", true), "ltr");
  assert.equal(resolveStrongDirection("حفل Halaa 2026", false), "rtl");
  assert.equal(resolveStrongDirection("2026", true), "rtl");
  assert.equal(resolveStrongDirection("", true), "rtl");
});

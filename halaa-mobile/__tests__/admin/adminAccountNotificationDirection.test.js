const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

// Blueprint §8 rows "Account settings" and "Notification settings" as reached
// from the ADMIN dashboard: AdminMoreScreen → AdminSettingsScreen → tabs →
// AdminAccountSettings / AdminNotificationSettings (+ the shared field shells
// they must reuse instead of forking).
const PAGE_TREE = [
  "screens/admin/admin-dashboard/AdminAccountSettingsScreen.js",
  "screens/admin/admin-dashboard/AdminNotificationSettingsScreen.js",
  "components/settings/AccountSettings.js",
  "components/settings/_components/EmailVerificationSection.js",
  "components/admin-dashboard/settings/AdminNotificationSettings.js",
];

const stripComments = (source) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");

test("admin account/notification tree keeps logical rows and never introduces row-reverse", () => {
  for (const rel of PAGE_TREE) {
    const source = read(rel);
    assert.ok(
      !source.includes("row-reverse"),
      `${rel} must not use flexDirection: row-reverse`
    );
    assert.ok(
      !/\bleft:\s*\d|right:\s*\d/.test(source),
      `${rel} must anchor semantic actions logically (start/end), not physically`
    );
    assert.ok(
      !/[\u202A-\u202E]/.test(source),
      `${rel} must isolate BiDi through shared helpers, not embedding marks`
    );
  }
});

test("admin account/notification tree renders inputs only through shared primitives", () => {
  for (const rel of PAGE_TREE) {
    const source = read(rel);
    assert.ok(
      !/import\s*\{[^}]*\bTextInput\b[^}]*\}\s*from\s*"react-native"/.test(source),
      `${rel} must not import the native TextInput directly`
    );
    // Shared field components (commen/TextInput, ToggleInput) render the
    // contract-compliant markup; only raw react-native inputs are forbidden.
    assert.ok(
      !/<RNTextInput|<TextInput\.KeyboardAvoiding/.test(source),
      `${rel} must render inputs through the shared field components`
    );
    assert.ok(
      !/import\s*\{[^}]*\bSwitch\b[^}]*\}\s*from\s*"react-native"/.test(source),
      `${rel} must render toggles through the shared ToggleInput`
    );
  }
});

test("AdminAccountSettingsScreen delegates to the shared AccountSettings field shell", () => {
  const screen = read("screens/admin/admin-dashboard/AdminAccountSettingsScreen.js");

  assert.match(screen, /import\s+AccountSettings\s+from\s+".*components\/settings\/AccountSettings"/,
    "the screen must reuse the migrated shared component");
  assert.match(screen, /<AccountSettings[\s\S]*?initialUser=\{profileUser\}/);
  assert.ok(screen.includes("onProfileUpdate") && screen.includes("onPasswordChange"),
    "profile + password mutations stay owned by the shared shell");

  // App bar copy is a translation key rendered by the shared TopBar —
  // the screen itself adds no local text nodes or form chrome.
  assert.match(screen, /<TopBar title=\{t\("tabs.account"\)\} showBack/);
  assert.ok(!screen.includes("<Text"), "no local text chrome on a thin screen");
  assert.ok(!screen.includes("useForm"), "form state lives in the shared shell only");
});

test("shared AccountSettings classifies every value per blueprint §5", () => {
  const source = read("components/settings/AccountSettings.js");

  // Full name is arbitrary user content: placeholder follows the UI locale,
  // a filled value follows its first strong character ("Ali" stays LTR).
  assert.match(source, /name="name"[\s\S]*?contentDirection="adaptive"/);
  // Username/email are canonical identifiers; passwords stay secret LTR tokens.
  // The email field itself flows through the shared EmailInput inside
  // EmailVerificationSection (asserted below); this shell registers its value.
  assert.match(source, /name="username"[\s\S]*?contentDirection="ltr"/);
  assert.match(source, /email:\s*user\?\.email \|\| ""/);
  assert.equal((source.match(/<PasswordInput/g) || []).length, 3,
    "current/new/confirm passwords all use the shared password primitive");

  // Section headings/descriptions/button labels always follow the UI locale.
  assert.match(source, /<LocalizedText role="sectionTitle"/);
  assert.match(source, /<LocalizedText[\s\S]*?role="description"/);
  const localizedUses = source.split("<LocalizedText").length - 1;
  assert.ok(localizedUses >= 5,
    `chrome must use LocalizedText roles, found ${localizedUses}`);
  assert.ok(
    !/import\s+\{[^}]*\bText\b[^}]*\}\s+from\s+"react-native"/.test(source),
    "plain Text must not bypass the localized role"
  );

  // Validation errors resolve through the localized schema factory.
  assert.match(source, /zodResolver\(accountSettingsSchema\(t\)\)/,
    "errors follow the UI locale, never the entered value's script");
});

test("EmailVerificationSection keeps email/OTP LTR while badge and actions stay localized", () => {
  const section = read("components/settings/_components/EmailVerificationSection.js");

  assert.ok(section.includes("<EmailInput"), "email uses the shared ltr input");
  assert.match(section, /<OTPInput[\s\S]*?value=\{verificationCode\}[\s\S]*?onChangeText=\{setVerificationCode\}/,
    "OTP digits flow through the shared controlled primitive");
  assert.match(section, /checkmark-circle[\s\S]*LocalizedText/,
    "verified badge keeps its semantic leading icon and localized label");
  assert.match(section, /<LocalizedText role="label"/);
  assert.ok(!/<Text/.test(section), "no plain Text chrome in the verification section");
});

test("AdminNotificationSettingsScreen loads errors through locale keys", () => {
  const screen = read("screens/admin/admin-dashboard/AdminNotificationSettingsScreen.js");

  assert.match(screen, /<TopBar title=\{t\("tabs.notifications"\)\} showBack/);
  assert.match(screen, /toast\.error\(error\.message \|\| t\("notifications\.updateError"\)\)/,
    "failure toast falls back to the translated key");
  assert.ok(!/"Failed to load|"Failed to update/.test(screen),
    "English fallback literals must not shadow the translation");
  assert.ok(!screen.includes("<Text"), "no local text chrome on a thin screen");
});

test("AdminNotificationSettings renders every toggle row through the shared primitives", () => {
  const component = read("components/admin-dashboard/settings/AdminNotificationSettings.js");
  const withoutComments = stripComments(component);

  const toggleRows = (component.match(/<ToggleInput/g) || []).length;
  assert.equal(toggleRows, 11, "6 app + 5 email preference rows expected");

  assert.match(component, /<LocalizedText role="sectionTitle"/);
  assert.match(component, /<LocalizedText role="description"/);
  assert.ok(component.includes('t("common.cancel")') &&
    component.includes('t("common.save")') &&
    component.includes('t("common.loading")'),
    "action buttons use keyed copy from the admin bundle");
  assert.ok(
    !/[\u0600-\u06FF]/.test(withoutComments),
    "no direct Arabic UI literals in the notification settings tree"
  );
  assert.ok(!/\$\{t\(/.test(component), "never concatenate t() output into sentences");
  assert.ok(
    !/import\s+\{[^}]*\bText\b[^}]*\}\s+from\s+"react-native"/.test(component),
    "plain Text must not bypass the localized role"
  );
});

test("admin navigator registers the same shared legal screens for privacy/terms/rules", () => {
  const navigator = read("navigation/AdminNavigator.js");

  assert.match(navigator,
    /import\s+PrivacyScreen\s+from\s+"\.\.\/screens\/legal\/PrivacyScreen";/);
  assert.match(navigator,
    /name="Privacy"[\s\S]*?component=\{PrivacyScreen\}/);
  assert.match(navigator,
    /name="Terms"[\s\S]*?component=\{TermsScreen\}/);
  assert.match(navigator,
    /name="CommunityRules"[\s\S]*?component=\{CommunityRulesScreen\}/);
});

// ── Locale resources ────────────────────────────────────────────────────

function dig(obj, dotted) {
  return dotted.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

// [namespace, key] — exactly how each page component resolves it at runtime.
const USED_KEYS = [
  // Admin settings hub + app bar titles
  ["settings", "title"],
  ["settings", "tabs.account"],
  ["settings", "tabs.notifications"],
  ["settings", "tabs.privacy"],
  ["settings", "tabs.terms"],
  ["settings", "tabs.communityRules"],
  ["settings", "tabs.logout"],
  ["settings", "tabs.logoutSuccess"],
  // Account settings form
  ["settings", "account.personalInfo"],
  ["settings", "account.fullName"],
  ["settings", "account.fullNamePlaceholder"],
  ["settings", "account.username"],
  ["settings", "account.usernamePlaceholder"],
  ["settings", "account.email"],
  ["settings", "account.emailPlaceholder"],
  ["settings", "account.changePassword"],
  ["settings", "account.changePasswordDescription"],
  ["settings", "account.currentPassword"],
  ["settings", "account.currentPasswordPlaceholder"],
  ["settings", "account.newPassword"],
  ["settings", "account.newPasswordPlaceholder"],
  ["settings", "account.confirmPassword"],
  ["settings", "account.confirmPasswordPlaceholder"],
  ["settings", "account.cancel"],
  ["settings", "account.saveChanges"],
  ["settings", "account.saving"],
  ["settings", "account.updateSuccess"],
  ["settings", "account.updateError"],
  ["settings", "account.wrongCurrentPassword"],
  ["settings", "account.passwordUpdateSuccess"],
  ["settings", "account.profileSavedPasswordFailed"],
  ["settings", "account.passwordSavedProfileFailed"],
  // Email verification section
  ["settings", "account.sendCode"],
  ["settings", "account.sending"],
  ["settings", "account.verifyCode"],
  ["settings", "account.verifying"],
  ["settings", "account.emailVerifiedBadge"],
  ["settings", "account.verificationCodeSent"],
  ["settings", "account.verificationCodeError"],
  ["settings", "account.invalidVerificationCode"],
  ["settings", "account.emailVerified"],
  ["settings", "account.verificationError"],
  // Notification preferences screen error toast
  ["settings", "notifications.updateError"],
  ["settings", "notifications.loadError"],
  // Admin notification preferences (admin bundle, settings.notifications.*)
  ["admin", "settings.notifications.appNotifications"],
  ["admin", "settings.notifications.appDescription"],
  ["admin", "settings.notifications.emailNotifications"],
  ["admin", "settings.notifications.emailDescription"],
  ["admin", "settings.notifications.newUsers"],
  ["admin", "settings.notifications.vendorApprovals"],
  ["admin", "settings.notifications.supportTickets"],
  ["admin", "settings.notifications.systemAlerts"],
  ["admin", "settings.notifications.paymentAlerts"],
  ["admin", "settings.notifications.subscriptionAlerts"],
  ["admin", "settings.notifications.dailyReport"],
  ["admin", "settings.notifications.weeklyReport"],
  ["admin", "settings.notifications.criticalAlerts"],
  ["admin", "settings.notifications.updateSuccess"],
  ["admin", "common.cancel"],
  ["admin", "common.save"],
  ["admin", "common.loading"],
];

test("every visible string used by this page group exists in BOTH ar and en bundles", () => {
  const arSettings = readJson("localization/locales/ar/settings.json");
  const enSettings = readJson("localization/locales/en/settings.json");
  const arAdmin = readJson("localization/locales/ar/admin.json");
  const enAdmin = readJson("localization/locales/en/admin.json");

  const bundles = { settings: { ar: arSettings, en: enSettings }, admin: { ar: arAdmin, en: enAdmin } };

  const missing = [];
  for (const [ns, key] of USED_KEYS) {
    for (const lang of ["ar", "en"]) {
      const value = dig(bundles[ns][lang], key);
      if (typeof value !== "string" || !value.trim()) missing.push(`${lang}/${ns}.json -> ${key}`);
    }
  }

  assert.deepEqual(missing, [], `missing keys:\n${missing.join("\n")}`);
});

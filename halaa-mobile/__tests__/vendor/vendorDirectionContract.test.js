const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Vendor home page + vendor settings iOS direction contract
 * (docs/implementation/HOST_IOS_DIRECTION_BLUEPRINT.md §8 Home / Settings,
 * §5 field contract, §6 text rules, §7 icon rules).
 *
 * Source-reading assertions follow the existing tickets/settings direction
 * contract conventions in this repository.
 */
const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

const VENDOR_HOME_TREE = [
  "screens/vendor/VendorHomeScreen.js",
  "components/vendor/home/Services.js",
  "components/vendor/home/Service.js",
  "components/vendor/home/AddServicePopup.js",
  "components/vendor/home/TagsSelector.js",
];

const VENDOR_SETTINGS_TREE = [
  "screens/vendor/VendorSettingsScreen.js",
  "components/vendor/VendorSettingsTabs.js",
  "components/settings/DeleteAccountSection.js",
];

test("VendorHomeScreen: localized chrome, adaptive brand name, locale-formatted stats", () => {
  const screen = read(VENDOR_HOME_TREE[0]);

  // Greeting/dashboard/stat labels/error are app copy → LocalizedText.
  assert.ok(screen.includes("LocalizedText"), "localized copy must use the LocalizedText role");
  assert.match(screen, /<AdaptiveText[^>]*styles\.organizationName/, "vendor brand name is backend content → AdaptiveText");
  assert.ok(screen.includes("isolateLtr"), "rating token must be isolated");

  // Counts/rating go through the shared locale formatters, never raw numbers.
  assert.match(screen, /formatCount\(/, "service counts must be locale-formatted");
  assert.match(screen, /formatNumber\(rating/, "rating must be locale-formatted");
  assert.doesNotMatch(screen, />\{activeServices\}|>\{totalServices\}|>\{rating\}</, "raw numeric stat nodes are gone");

  // Decorative texture overlays keep documented physical artwork geometry…
  assert.match(screen, /textureLeft[\s\S]*?left:\s*-190/, "texture artwork keeps its physical geometry");
  // …and the exception is annotated (blueprint §2).
  assert.match(screen, /physical-artwork\s+exception|intentionally physical/i);

  assert.ok(!screen.includes("row-reverse"));
  assert.ok(!/TextInput/.test(screen), "home screen must not touch any native input");
});

test("Vendor home tree: no row-reverse and no direct native TextInput bypass", () => {
  for (const rel of VENDOR_HOME_TREE.concat(VENDOR_SETTINGS_TREE)) {
    const source = read(rel);
    assert.ok(!source.includes("row-reverse"), `${rel} must not use flexDirection: row-reverse`);
    assert.ok(
      !/TextInput\s+as\s+\w+\}?\s*from\s+"react-native"/.test(source),
      `${rel} must not import the native TextInput directly`
    );
  }
});

test("Services: adaptive search field, localized empty state/filters, labelled add action", () => {
  const source = read("components/vendor/home/Services.js");

  assert.ok(source.includes('from "../../commen/DirectionalTextInput"'), "search stays on the shared directional primitive");
  assert.match(source, /contentDirection="adaptive"/, "search queries resolve first-strong (blueprint §5.3)");
  assert.ok(source.includes("LocalizedText"), "empty-state/filter labels are app copy");
  assert.match(
    source,
    /accessibilityLabel=\{t\("services\.addService"\)\}/,
    "icon-only add actions need a localized accessibility label"
  );
  // Magnify/list/check icons are semantic — they must NOT be wrapped in a
  // directional wrapper.
  assert.ok(!source.includes("DirectionalIonicon"), "semantic filter/search glyphs stay unmirrored");
});

test("ServiceCard: backend name/tags adaptive, chrome localized, atomic LTR price token", () => {
  const source = read("components/vendor/home/Service.js");

  assert.match(source, /<AdaptiveText[^>]*styles\.title/, "service name follows its own first-strong direction");
  assert.match(source, /<AdaptiveText[^>]*styles\.tagText/, "category tags are user/backend content");

  assert.ok(source.includes("LocalizedText"), "availability/edit labels are app copy");
  // Price number + SAR glyph is one atomic token pinned LTR (blueprint §6).
  assert.match(
    source,
    /priceWithCurrency:[\s\S]{0,120}direction:\s*"ltr"/,
    "price token row must pin stable LTR so digits/SAR glyph cannot split"
  );
  // Semantic anchors use logical edges.
  assert.match(source, /editButton:\s*\{[\s\S]*?end:\s*12/, "edit pill anchors to the logical end edge");
  assert.match(source, /deleteButton:\s*\{[\s\S]*?start:\s*12/, "delete action anchors to the logical start edge");
  assert.match(source, /accessibilityLabel=\{t\("common\.delete"\)\}/, "icon-only delete needs a localized accessibility label");
});

test("AddServicePopup: explicit field content modes across the whole form", () => {
  const source = read("components/vendor/home/AddServicePopup.js");

  const count = (needle) => source.split(needle).length - 1;
  assert.equal(count("contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}"), 3, "serviceName + description + included item input are adaptive");
  assert.equal(count("contentDirection={CONTENT_DIRECTIONS.RTL}"), 2, "nameAr/descriptionAr are explicitly Arabic-only fields");
  assert.match(source, /name="price"[\s\S]{0,220}CONTENT_DIRECTIONS\.LTR/, "price is an intrinsically LTR numeric token");

  assert.ok(source.includes("LocalizedText"), "sheet title/included label/buttons are app copy");
  assert.match(source, /<AdaptiveText[^>]*styles\.includedChipText/, "included chip values are user/backend content");
  assert.match(source, /accessibilityLabel=\{t\("services\.cancel"\)\}/, "close control needs a localized accessibility label");
  assert.match(source, /accessibilityLabel=\{t\("services\.includedAdd"\)\}/, "icon-only plus button needs a localized accessibility label");
  assert.ok(!source.includes("اختر صورة") && !/[\u0600-\u06FF]/.test(source), "no Arabic UI literals inside the component tree");
});

test("ImageInput (shared): no hardcoded Arabic fallback, localized chrome", () => {
  const source = read("components/commen/ImageInput.js");

  assert.ok(!/[\u0600-\u06FF]/.test(source), "shared primitive must not embed Arabic literals");
  assert.ok(source.includes("LocalizedText"), "label/placeholder/error render through the localized role");
  assert.ok(!source.includes("|| \"اختر\""), "placeholder fallback removed");
});

test("NotificationBell (shared): localized badge accessibility + locale digits", () => {
  const source = read("components/notifications/NotificationBell.js");

  assert.ok(source.includes("localizeDigits"), "badge count follows the active digit system");
  assert.match(source, /t\("notifications\.unreadBadge"/, "icon-only bell needs a localized accessibility label");
  assert.ok(!source.includes("`Notifications${"), "hardcoded English accessibility string removed");
});

test("TagsSelector: localized section label and options", () => {
  const source = read("components/vendor/home/TagsSelector.js");
  assert.ok(source.includes("LocalizedText"), "tag labels render through the localized role");
  assert.ok(!/"react-native"[\s\S]{0,40}\bText\b/.test(source), "no plain Text import bypassing the role primitives");
});

test("VendorSettingsTabs: rows are localized; logout arrow mirrors only under RTL", () => {
  const source = read("components/vendor/VendorSettingsTabs.js");

  assert.ok(source.includes("LocalizedText"), "tab labels are app copy");
  assert.ok(source.includes("DirectionalIonicon"), "navigation chevrons flip with the locale");
  assert.match(source, /isRTL\s*\?\s*styles\.logoutIconRTL\s*:\s*null/, "logout rotation must be RTL-conditional, never unconditional");
  const rotateIdx = source.indexOf('rotate: "180deg"');
  const rtlStyleIdx = source.indexOf("logoutIconRTL: {");
  assert.ok(
    rotateIdx > -1 && rtlStyleIdx > -1 && source.slice(rtlStyleIdx, rotateIdx).length < 60,
    "the 180° rotation lives only inside the RTL-only style"
  );
});

test("DeleteAccountSection (shared): i18n keys replace the bilingual dictionary with isolated store names", () => {
  const source = read("components/settings/DeleteAccountSection.js");

  assert.ok(!source.includes("const COPY"), "inline AR/EN COPY dictionary must be migrated to translation keys");
  assert.match(source, /t\("deleteAccount\.storeWarnBody"\)/, "store-subscription warning comes from settings.json");
  assert.ok(source.includes("LocalizedText"), "modal chrome renders through localized text roles");
  assert.match(source, /<AdaptiveText[^>]*styles\.retention/, "backend retention copy is mixed user/backend content → AdaptiveText");

  // Credential fields keep intrinsically-LTR values while the confirm keyword
  // follows the UI locale (it mirrors the localized keyword itself).
  assert.match(source, /contentDirection="localized"[\s\S]{0,160}autoCapitalize="characters"|contentDirection="localized"/, "confirm keyword field stays locale-directed");
  assert.match(source, /secureTextEntry[\s\S]{0,200}contentDirection="ltr"/, "password value stays LTR");
  assert.match(source, /keyboardType="number-pad"[\s\S]{0,160}contentDirection="ltr"/, "OTP value stays LTR");
  assert.ok(source.includes('from "../commen/DirectionalTextInput"'), "inputs stay on the shared directional primitive");
});

test("Locale bundles: English vendor copy contains no Arabic literals; store names isolated in Arabic", () => {
  const enVendor = JSON.parse(read("localization/locales/en/vendor.json"));
  const flat = [];
  (function walk(obj, prefix) {
    for (const [key, value] of Object.entries(obj)) {
      const keyPath = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") walk(value, keyPath);
      else flat.push([keyPath, String(value)]);
    }
  })(enVendor, "");

  const arabicLiterals = flat.filter(([, v]) => /[\u0600-\u06FF]/.test(v));
  assert.deepEqual(
    arabicLiterals.map(([k]) => k),
    [],
    "English vendor bundle must not contain Arabic UI literals"
  );

  const arSettings = JSON.parse(read("localization/locales/ar/settings.json"));
  const body = arSettings.deleteAccount.storeWarnBody;
  assert.match(body, /\u2066App Store \/ Google Play\u2069/, "Arabic disclosure isolates the LTR store-name token");
  assert.equal(
    (body.match(/\u2069/g) || []).length,
    (body.match(/\u2066/g) || []).length,
    "isolate marks balanced inside storeWarnBody"
  );

  const enSettings = JSON.parse(read("localization/locales/en/settings.json"));
  for (const key of [
    "storeWarnTitle",
    "storeWarnBody",
    "manageSubscription",
    "passwordLabel",
    "passwordPlaceholder",
    "otpLabel",
    "otpPlaceholder",
    "sendCode",
    "codeSent",
  ]) {
    assert.ok(enSettings.deleteAccount[key], `en settings.deleteAccount.${key} exists`);
    assert.ok(arSettings.deleteAccount[key], `ar settings.deleteAccount.${key} exists`);
  }

  const enCommon = JSON.parse(read("localization/locales/en/common.json"));
  const arCommon = JSON.parse(read("localization/locales/ar/common.json"));
  assert.ok(enCommon.notifications.unreadBadge && arCommon.notifications.unreadBadge, "bell unread-badge key exists in both locales");
});

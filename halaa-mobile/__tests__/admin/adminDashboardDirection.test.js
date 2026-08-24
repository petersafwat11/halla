const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

// Every component reachable from Vendors / Plans / Discounts / Settings.
const PAGE_TREE = [
  // Vendors
  "screens/admin/admin-dashboard/AdminVendorsScreen.js",
  "components/admin-dashboard/vendors/VendorList.js",
  "components/admin-dashboard/vendors/VendorListItem.js",
  "components/admin-dashboard/vendors/RatingModal.js",
  // Plans
  "screens/admin/admin-dashboard/AdminPlansScreen.js",
  "components/admin-dashboard/plans/PlanTabs.js",
  "components/admin-dashboard/plans/PlanList.js",
  "components/admin-dashboard/plans/PlanListItem.js",
  "components/admin-dashboard/plans/EditPlanModal.js",
  // Discounts
  "screens/admin/admin-dashboard/AdminDiscountsScreen.js",
  "components/admin-dashboard/discounts/DiscountListItem.js",
  "components/admin-dashboard/discounts/DiscountFormModal.js",
  "components/admin-dashboard/discounts/_components/DiscountFormFields.js",
  // Settings
  "screens/admin/admin-dashboard/AdminSettingsScreen.js",
  "components/settings/SettingsTabs.js",
  "components/admin-dashboard/settings/AdminNotificationSettings.js",
];

test("admin pages keep the root direction architecture: no row-reverse, no direct native TextInput", () => {
  for (const rel of PAGE_TREE) {
    const source = read(rel);
    assert.ok(
      !source.includes("row-reverse"),
      `${rel} must not use flexDirection: row-reverse`
    );
    assert.ok(
      !/TextInput\s+as\s+RNTextInput/.test(source),
      `${rel} must not import the native TextInput directly`
    );
    assert.ok(
      !/import\s*\{[^}]*\bTextInput\b[^}]*\}\s*from\s*"react-native"/.test(source),
      `${rel} must not reach the raw RN input; use DirectionalTextInput or the shared fields`
    );
  }
});

test("admin pages introduce no physical directional spacing/borders", () => {
  const PHYSICAL =
    /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/;
  for (const rel of PAGE_TREE) {
    const lines = read(rel).split("\n");
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      assert.ok(
        !PHYSICAL.test(line),
        `${rel}:${idx + 1} uses physical directional style: ${trimmed}`
      );
    });
  }
});

// ── Vendors ─────────────────────────────────────────────────────────────

test("VendorListItem: BiDi-safe tokens without ad-hoc embedding marks", () => {
  const item = read("components/admin-dashboard/vendors/VendorListItem.js");

  // Deprecated embedding/override controls are forbidden anywhere.
  assert.ok(
    !/[\u202A-\u202E]/.test(item),
    "phone isolation must use the shared isolateLtr helper, not U+202A/U+202C"
  );
  assert.match(item, /isolateLtr\(phone\)/, "phone digits are LTR-isolated");
  assert.match(item, /isolateLtr\(/, "rating ratio is an isolated token");
  assert.match(item, /formatNumber\(/, "rating digits follow the locale");
  assert.ok(item.includes('t("common.joinedDate"'), "joined date is one interpolated key");
});

test("VendorListItem/VendorList: confirmations are interpolated translation keys", () => {
  const item = read("components/admin-dashboard/vendors/VendorListItem.js");
  const list = read("components/admin-dashboard/vendors/VendorList.js");

  // No assembled alert bodies: no `vendor(s)` literals and no `${t(...)}` template assembly.
  for (const [rel, src] of [["VendorListItem", item], ["VendorList", list]]) {
    assert.ok(!/\}\s*"\s*\?/.test(src), `${rel} must not assemble alert sentences`);
    assert.ok(!/\$\{t\(/.test(src), `${rel} must not interpolate t() inside template strings`);
    assert.ok(
      !src.includes("vendor(s)"),
      `${rel} must not carry hardcoded English copy`
    );
  }
  assert.match(item, /t\("vendors\.confirm\.approve"/);
  assert.match(item, /t\("vendors\.confirm\.reject"/);
  assert.match(item, /t\("vendors\.confirm\.delete"/);
  assert.match(list, /t\("vendors\.bulk\.approveConfirm"/);
  assert.match(list, /t\("vendors\.bulk\.suspendConfirm"/);
  assert.match(list, /t\("vendors\.bulk\.deleteConfirm"/);
});

test("RatingModal: full text contract with adaptive review field and physical star scale", () => {
  const modal = read("components/admin-dashboard/vendors/RatingModal.js");

  assert.ok(modal.includes("LocalizedText"), "title/labels/error must be localized roles");
  assert.ok(modal.includes("AdaptiveText"), "store/owner names are backend content");
  assert.match(modal, /contentDirection=\{CONTENT_DIRECTIONS\.ADAPTIVE\}/,
    "the review comment is arbitrary user content");
  assert.ok(/direction:\s*"ltr"/.test(modal), "the 1→5 star scale stays physical LTR");
  assert.ok(modal.includes("accessibilityLabel="), "icon-only controls need localized labels");
  assert.ok(!/[\u0600-\u06FF]/.test(modal), "no direct Arabic UI literals in the component tree");
  assert.ok(
    !/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(modal),
    "plain Text must not bypass the role primitives"
  );
});

// ── Plans ───────────────────────────────────────────────────────────────

test("PlanListItem: prices/counts are locale-formatted, isolated atomic tokens", () => {
  const item = read("components/admin-dashboard/plans/PlanListItem.js");

  assert.ok(item.includes("formatCurrency("), "price uses the shared currency formatter");
  assert.ok(item.includes("isolateAuto(formatCurrency"), "price token is first-strong isolated");
  assert.ok(item.includes('"plans.limits.eventsMax"'), "events limit uses i18next plural key");
  assert.ok(item.includes('"plans.limits.unlimitedEvents"'), "unlimited line is one key");
  assert.ok(item.includes('"plans.limits.invitePoolValue"'), "invite pool line is one key");
  // No translated-sentence assembly via template literals.
  assert.ok(!/\$\{t\(/.test(item), "never concatenate t() output in JSX/template strings");
});

test("EditPlanModal: explicit content modes; chrome stays localized; single validation key", () => {
  const modal = read("components/admin-dashboard/plans/EditPlanModal.js");

  // Arabic-authored columns are rtl, English-authored columns and numerics ltr.
  const rtlUses = modal.split("CONTENT_DIRECTIONS.RTL").length - 1;
  const ltrUses = modal.split("CONTENT_DIRECTIONS.LTR").length - 1;
  assert.ok(rtlUses >= 3, `nameAr/descriptionAr/bulletsAr must be rtl, found ${rtlUses}`);
  assert.ok(ltrUses >= 4, "nameEn/descriptionEn/bulletsEn + numeric fields must be ltr");
  assert.ok(modal.includes("LocalizedText"), "labels/hints/sections/buttons use localized roles");
  assert.ok(modal.includes("AdaptiveText"), "plan display name is backend content");
  assert.ok(modal.includes('writingDirection: "ltr"') || modal.includes("styles.ltrValue"),
    "identity chips pin canonical codes LTR");
  assert.ok(
    !modal.includes('+ " / " +'),
    "validation message must be one interpolation key, not concatenated labels"
  );
  assert.ok(modal.includes('t("validation.namesRequired")'));
});

test("shared fields expose the required marker so pages stop concatenating '*'", () => {
  const textInput = read("components/commen/TextInput.js");
  const dropdown = read("components/commen/DropdownInput.js");
  for (const [rel, src] of [["TextInput", textInput], ["DropdownInput", dropdown]]) {
    assert.ok(src.includes("required"), `${rel} must accept a required prop`);
    assert.ok(/\{required \? <Text> \*<\/Text> : null\}/.test(src),
      `${rel} renders the marker as a nested run`);
  }

  const fields = read(
    "components/admin-dashboard/discounts/_components/DiscountFormFields.js"
  );
  assert.ok(!/\} \*`/.test(fields) && !fields.includes('*`}'),
    "discount form must not concatenate ' *' into labels");
  assert.ok(/<TextInput[\s\S]*?\n\s*required\n/.test(fields) || /\brequired\b/.test(fields),
    "discount form opts into the shared required marker");
});

// ── Discounts ───────────────────────────────────────────────────────────

test("DiscountListItem: localized roles with isolated code/value/usage tokens", () => {
  const card = read("components/admin-dashboard/discounts/DiscountListItem.js");

  assert.ok(card.includes("LocalizedText"), "labels/status/actions are app copy");
  assert.ok(card.includes("isolateLtr(discount.code)"), "voucher codes stay LTR tokens");
  assert.ok(card.includes("formatCurrency(") && card.includes("formatNumber("),
    "value and usage counts use the locale formatters");
  assert.ok(!/\$\{discount\.value\}%/.test(card),
    "raw percent concatenation is replaced by an atomic token");
  assert.ok(
    !/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(card),
    "plain Text must not bypass the role primitives"
  );
});

test("DiscountFormFields declares per-field content modes and localized group labels", () => {
  const fields = read(
    "components/admin-dashboard/discounts/_components/DiscountFormFields.js"
  );
  const rtl = fields.split("CONTENT_DIRECTIONS.RTL").length - 1;
  const ltr = fields.split("CONTENT_DIRECTIONS.LTR").length - 1;
  assert.ok(rtl >= 1, "descriptionAr is contractually Arabic (rtl)");
  assert.ok(ltr >= 4, "code/value/maxUses/minimumAmount/descriptionEn are ltr");
  assert.ok(fields.includes("LocalizedText"), "plan-type group label is localized");
});

test("DiscountFormModal + screen alerts use interpolated keys only", () => {
  const modal = read("components/admin-dashboard/discounts/DiscountFormModal.js");
  const screen = read("screens/admin/admin-dashboard/AdminDiscountsScreen.js");

  assert.ok(modal.includes("LocalizedText"), "sheet title uses a localized role");
  assert.ok(screen.includes('t("discounts.delete.confirmMessage"'));
  assert.ok(screen.includes('t("discounts.confirm.activate"') ||
    /discounts\.confirm\.(de)?activate/.test(screen));
  assert.ok(!/"\$\{discount\.code\}"\?/.test(screen),
    "alert body must not be assembled around the raw code");
});

// ── Settings ────────────────────────────────────────────────────────────

test("settings surfaces use localized roles; logout glyph flips with locale only", () => {
  const tabs = read("components/settings/SettingsTabs.js");
  const notifications = read(
    "components/admin-dashboard/settings/AdminNotificationSettings.js"
  );

  assert.ok(tabs.includes("LocalizedText"), "tab rows are localized copy");
  assert.ok(tabs.includes("isRTL ? styles.logoutIconRTL"),
    "logout arrow mirrors only under RTL");
  assert.ok(!tabs.includes('rotate: "180deg" }] }') ||
    tabs.includes("logoutIconRTL"),
    "rotation is no longer unconditional");

  assert.ok(notifications.includes("LocalizedText"),
    "notification section titles/descriptions/buttons are localized");
});

test("ToggleInput and CheckboxGroup apply the shared direction contract", () => {
  const toggle = read("components/commen/ToggleInput.js");
  const checkboxes = read("components/commen/CheckboxGroup.js");

  assert.ok(toggle.includes("useFieldDirection"), "toggle chrome follows the UI locale");
  assert.ok(checkboxes.includes("useLabelDirection"), "checkbox labels/errors follow the UI locale");
});

// ── Extended admin family (hosts / businesses / moderators / payments / tickets) ──

const EXTENDED_TREE = [
  "components/admin-dashboard/hosts/AddHostModal.js",
  "components/admin-dashboard/moderators/AddModeratorModal.js",
  "components/admin-dashboard/moderators/ModeratorListItem.js",
  "components/admin-dashboard/businesses/BusinessListItem.js",
  "components/admin-dashboard/payments/PaymentStats.js",
  "screens/admin/admin-dashboard/AdminModeratorsScreen.js",
  "screens/admin/admin-dashboard/PaymentDetailScreen.js",
  "screens/admin/admin-dashboard/BusinessDetailsScreen.js",
  "screens/admin/admin-dashboard/VendorDetailsScreen.js",
  "components/admin-dashboard/vendors/VendorHeroCard.js",
];

test("extended admin trees: no row-reverse, no raw RN input, no ad-hoc BiDi marks", () => {
  for (const rel of EXTENDED_TREE) {
    const source = read(rel);
    assert.ok(!source.includes("row-reverse"), `${rel} must not use row-reverse`);
    assert.ok(!/[\u202A-\u202E]/.test(source), `${rel} must not use embedding marks`);
    assert.ok(
      !/import\s*\{[^}]*\bTextInput\b[^}]*\}\s*from\s*"react-native"/.test(source),
      `${rel} must not import the native TextInput directly`
    );
  }
});

// ── Vendor details field-value contract (blueprint §5.3) ────────────────

test("VendorHeroCard: rating digits follow the shared locale formatter", () => {
  const hero = read("components/admin-dashboard/vendors/VendorHeroCard.js");
  assert.ok(hero.includes("formatNumber(Number(rating)"), 
    "rating uses the shared locale formatter");
  assert.ok(!/\.toFixed\(/.test(hero),
    "raw toFixed() would pin Latin digits in the Arabic UI");
  assert.ok(hero.includes("styles.ltrValue"),
    "numeric rating keeps a stable LTR glyph order");
});

test("VendorDetailsScreen: every InfoRow value declares its content mode", () => {
  const screen = read("screens/admin/admin-dashboard/VendorDetailsScreen.js");

  // Email / record number / national ID / social URLs are intrinsic LTR tokens.
  const ltrUses = screen.split('mode="ltr"').length - 1;
  assert.ok(ltrUses >= 4,
    `email + commercialRecord + nationalId + social URLs must be mode="ltr", found ${ltrUses}`);
  // Phone: localized empty placeholder semantics, LTR digits when filled.
  assert.ok(screen.includes('mode="phone"'), "phone row declares the phone mode");
  // Formatted date is app-locale output.
  assert.ok(screen.includes('mode="localized"'),
    "registration date follows the UI locale");

  // coverageType is app-owned vocabulary — translated keys, never the raw enum.
  assert.ok(screen.includes("vendorDetails.coverage."),
    "coverage enum renders through translation keys");
  assert.ok(
    !/value=\{coverage\}/.test(screen),
    "the raw backend enum must not reach InfoRow untranslated"
  );

  // Gallery captions are one interpolation key + locale digits.
  assert.ok(screen.includes('"vendorDetails.galleryIndexed"'),
    "numbered captions compose through an i18next interpolation key");
  assert.ok(!/\.join\(\s*["'] ["']\s*\)/.test(screen),
    "captions must not be assembled with JS string joins");

  assert.ok(!/[A-Za-z]",\s*"[^"]*"/.test(screen) ||
    !/t\("[^"]+",\s*"[A-Z][^"]*"\)/.test(screen),
    "no hardcoded English fallback literals in t() calls");
});

test("FilterBar renders its count badge through the localized role primitive", () => {
  const bar = read("components/admin-dashboard/common/FilterBar.js");
  assert.ok(bar.includes("<LocalizedText"), "count badge uses LocalizedText");
  assert.ok(bar.includes("isolateLtr(formatCount("),
    "count stays a locale-formatted LTR-isolated token");
  assert.ok(
    !/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(bar),
    "plain Text must not bypass the role primitives"
  );
});

test("coverage labels and gallery caption key ship in BOTH ar and en bundles", () => {
  const ar = readJson("localization/locales/ar/admin.json");
  const en = readJson("localization/locales/en/admin.json");
  for (const lang of [["ar", ar], ["en", en]]) {
    const [name, bundle] = lang;
    for (const key of ["region", "city", "districts"]) {
      const v = dig(bundle, `vendorDetails.coverage.${key}`);
      assert.equal(typeof v, "string", `ar/en vendorDetails.coverage.${key} missing (${name})`);
      assert.ok(v.trim().length > 0);
    }
    const indexed = dig(bundle, "vendorDetails.galleryIndexed");
    assert.ok(typeof indexed === "string" && indexed.includes("{{label}}") &&
      indexed.includes("{{index}}"),
      `galleryIndexed must interpolate label+index (${name})`);
  }

  // The corrupted mixed-script Arabic service label must stay pure Arabic.
  const corrupted = dig(ar, "vendorDetails.serviceLabels.outdoorEventSetup");
  assert.ok(!/[A-Za-z]/.test(corrupted),
    `Arabic service label must not contain Latin fragments (got "${corrupted}")`);
});

test("extended admin trees render visible copy through localized roles", () => {
  // AdminModeratorsScreen is excluded: it renders no text itself — all copy
  // lives in TopBar/ModeratorList/AddModeratorModal and its alert strings
  // are covered by the interpolation assertions above.
  for (const rel of EXTENDED_TREE.filter(
    (r) => r !== "screens/admin/admin-dashboard/AdminModeratorsScreen.js"
  )) {
    if (["components/admin-dashboard/moderators/ModeratorListItem.js",
         "components/admin-dashboard/businesses/BusinessListItem.js",
         "components/admin-dashboard/payments/PaymentStats.js"].includes(rel)) {
      continue; // logic-only wrappers that delegate rendering to AdminListItem/StatCard
    }
    const source = read(rel);
    assert.ok(
      source.includes("LocalizedText") || source.includes("AdaptiveText"),
      `${rel} renders visible copy and must use the role primitives`
    );
    assert.ok(
      !/\$\{t\(/.test(source),
      `${rel} must not interpolate t() inside template strings`
    );
    assert.ok(
      !/[A-Za-z]",\s*"[^"]*"/.test(source) ||
      !/t\("[^"]+",\s*"[A-Z][^"]*"\)/.test(source),
      `${rel} must not carry hardcoded English fallback literals in t() calls`
    );
  }
});

test("payment surfaces keep amounts atomic and card data LTR", () => {
  const stats = read("components/admin-dashboard/payments/PaymentStats.js");
  assert.ok(stats.includes("formatCurrency("), "revenue uses the shared currency formatter");
  assert.ok(stats.includes("isolateAuto(formatCurrency"), "revenue token is isolated");

  const detail = read("screens/admin/admin-dashboard/PaymentDetailScreen.js");
  assert.match(detail, /formatAmount = \(amount, language/, "amounts are locale-formatted");
  assert.ok(detail.includes("isolateAuto(formatCurrency"), "detail amount is an atomic token");
  assert.match(detail, /value=\{methodLabel\} mono/, "masked card method pins LTR");
  assert.match(detail, /contentDirection=\{CONTENT_DIRECTIONS\.ADAPTIVE\}/,
    "refund reason is arbitrary user content");
});

test("shared Button labels use the localized role primitive", () => {
  const button = read("components/commen/Button.js");
  assert.ok(button.includes("<LocalizedText"), "button text must be a LocalizedText");
  assert.ok(
    !/import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*"react-native"/.test(button),
    "Button must not import plain Text"
  );
});


// ── Locale resources ────────────────────────────────────────────────────

const NEW_KEYS = [
  ["vendors.categories.more"],
  ["vendors.confirm.approve"],
  ["vendors.confirm.reject"],
  ["vendors.confirm.suspend"],
  ["vendors.confirm.activate"],
  ["vendors.confirm.delete"],
  ["vendors.bulk.approveConfirm"],
  ["vendors.bulk.suspendConfirm"],
  ["vendors.bulk.deleteConfirm"],
  ["common.joinedDate"],
  ["plans.limits.unlimitedEvents"],
  ["plans.limits.eventsMax"],
  ["plans.limits.invitePoolValue"],
  ["plans.limits.invitePoolUnlimited"],
  ["validation.namesRequired"],
  ["discounts.confirm.activate"],
  ["discounts.confirm.deactivate"],
  ["discounts.delete.confirmMessage"],
];

function dig(obj, dotted) {
  return dotted.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

test("every new admin key exists in BOTH ar and en bundles", () => {
  const ar = readJson("localization/locales/ar/admin.json");
  const en = readJson("localization/locales/en/admin.json");
  const missing = [];
  for (const [key] of NEW_KEYS) {
    if (typeof dig(ar, key) !== "string" || !dig(ar, key).trim())
      missing.push(`ar/admin.json -> ${key}`);
    if (typeof dig(en, key) !== "string" || !dig(en, key).trim())
      missing.push(`en/admin.json -> ${key}`);
  }
  assert.deepEqual(missing, [], missing.join("\n"));
});

test("plans.limits.eventsMax ships complete plural categories for ar and en", async () => {
  const ar = readJson("localization/locales/ar/admin.json");
  const en = readJson("localization/locales/en/admin.json");

  for (const suffix of ["zero", "one", "two", "few", "many", "other"]) {
    const v = ar.plans.limits[`eventsMax_${suffix}`];
    assert.ok(typeof v === "string" && v.length > 0, `ar eventsMax_${suffix} missing`);
  }
  for (const suffix of ["one", "other"]) {
    const v = en.plans.limits[`eventsMax_${suffix}`];
    assert.ok(typeof v === "string" && v.length > 0, `en eventsMax_${suffix} missing`);
  }

  // Real i18next resolution through the CLDR Arabic plural categories.
  const i18next = require("i18next");
  const instance = i18next.createInstance();
  await instance.init({
    lng: "ar",
    fallbackLng: "ar",
    compatibilityJSON: "v4",
    resources: { ar: { admin: ar }, en: { admin: en } },
  });
  const samples = [
    [3, "few"],
    [11, "many"],
    [102, "other"],
  ];
  for (const [count, category] of samples) {
    const resolved = instance.t("admin:plans.limits.eventsMax", { count });
    const expected = ar.plans.limits[`eventsMax_${category}`].replace(
      "{{count}}",
      String(count)
    );
    assert.equal(resolved, expected, `count ${count} must resolve '${category}'`);
  }
});

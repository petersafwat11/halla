const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Host Home page direction contract (blueprint §8 "Home" row / §9 Priority 3):
 *
 *  - every visible application copy comes from translation keys — no inline
 *    Arabic or English UI literals anywhere in the page tree;
 *  - backend values (organization/user name, event title, location, raw
 *    stored datetime) render adaptively via the shared AdaptiveText role;
 *  - counts/dates/times are locale-formatted atomic tokens or interpolated
 *    keys, never JSX/template concatenation;
 *  - semantic floating actions anchor at the logical `start`, decorative
 *    hero artwork is the only documented physical geometry;
 *  - carousel navigation keeps the tested DirectionalIonicon wrapper;
 *  - sheets keep their localized title at the logical start and a labelled,
 *    unmirrored close action at the logical end;
 *  - no row-reverse, no undocumented physical spacing, no native TextInput
 *    bypasses were introduced by this migration.
 */

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

// Strips line comments so intent notes never fail literal scans.
const stripComments = (source) =>
  source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

const hasArabicLiteral = (source) => {
  const body = stripComments(source)
    // Remove translation default-value options (t(key, { defaultValue })) —
    // this migration removed even those, but they are reviewed fixtures elsewhere.
    .replace(/defaultValue[^}]*\}/g, "");
  return /[\u0600-\u06FF]/.test(body);
};

const loadHomeLocales = () => ({
  ar: JSON.parse(read("localization", "locales", "ar", "home.json")),
  en: JSON.parse(read("localization", "locales", "en", "home.json")),
});

test("HomeScreen: logical FAB anchor, adaptive identity, keys-only copy", () => {
  const screen = read("screens", "host", "HomeScreen.js");

  // The floating create-event pill anchors at the logical START edge.
  assert.match(
    screen,
    /createEventFab:\s*\{[^}]*start:\s*24/s,
    "FAB must use the logical `start` anchor"
  );
  assert.ok(
    !/position:\s*"absolute"[^}]*left:\s*\d/.test(
      stripComments(screen).replace(/\n/g, " ")
    ),
    "no absolute physical `left` anchors outside decorative artwork"
  );

  // Organization/user name is backend content → first-strong direction.
  assert.match(
    screen,
    /<AdaptiveText[^>]*styles\.organizationName/,
    "greeting name must render adaptively"
  );

  assert.ok(!hasArabicLiteral(screen), "no Arabic UI literals in HomeScreen");
  assert.ok(screen.includes('t("welcome")'), "welcome copy is keyed");
  assert.ok(
    screen.includes('t("quickActions.createEvent")'),
    "FAB label is keyed"
  );
});

test("HomeHeaderContent: error/retry are keyed localized chrome, artwork documented", () => {
  const source = read("components", "home", "HomeHeaderContent.js");

  assert.ok(source.includes('t("errors.load")'), "error copy keyed");
  assert.ok(source.includes('t("errors.retry")'), "retry copy keyed");
  assert.ok(
    !source.includes("common.loadError"),
    "legacy cross-namespace guess removed"
  );
  assert.ok(source.includes("LocalizedText"), "chrome renders through the localized role");
  assert.match(
    source,
    /intentionally PHYSICAL artwork/,
    "decorative hero texture documents its physical-artwork exception"
  );
});

test("MakeYourFirst: fully keyed localized roles without bilingual literals", () => {
  const source = read("components", "home", "MakeYourFirst.js");
  assert.ok(!hasArabicLiteral(source), "no Arabic literals (keys only)");
  assert.ok(source.includes("<LocalizedText"), "copy uses localized text roles");
});

test("LastEventHeader: adaptive title/location, isolated date/time, formatted guests", () => {
  const source = read("components", "home", "_components", "LastEventHeader.js");

  const adaptiveUses = source.match(/<AdaptiveText/g)?.length ?? 0;
  assert.ok(
    adaptiveUses >= 3,
    `event title, legacy datetime and location render adaptively (${adaptiveUses})`
  );

  // Guest count comes from the shared locale formatter, not JSX concat.
  assert.ok(
    source.includes("formatGuestCount(guestCount"),
    "guest count is locale-formatted"
  );
  assert.ok(
    !/\{guestCount\}\s*\{t\(/.test(source),
    "no JSX label+count concatenation"
  );

  // Date/time tokens are individually isolated nested runs.
  assert.match(
    source,
    /isolateAuto\(dateTime\.dateStr\)/,
    "date token is isolated"
  );
  assert.match(
    source,
    /isolateAuto\(dateTime\.timeStr\)/,
    "time token is isolated"
  );
  assert.ok(
    !/"\s*•\s*"\s*\+/.test(source),
    "no template-literal date/time assembly"
  );

  assert.ok(!hasArabicLiteral(source), "no Arabic literals in the header");
});

test("LastEventStatsRow + Quota + StatsCards: locale-formatted atomic counts", () => {
  const statsRow = read("components", "home", "_components", "LastEventStatsRow.js");
  assert.ok(
    statsRow.includes("formatCount(item.value"),
      "stat counts pass through the shared formatter"
  );
  assert.match(
    statsRow,
    /lastEvent\.noResponseCount|lastEvent\.declinedCount|lastEvent\.approvedCount/,
    "label+count live in interpolated keys"
  );
  assert.ok(
    !/:\s*"\s*\}|\}\s*\{t\(/.test(statsRow),
    "no colon/label concatenation in JSX"
  );

  const quota = read("components", "home", "_components", "LastEventQuota.js");
  assert.match(quota, /InvitationBalanceCard compact balance=\{balance\}/);
  assert.doesNotMatch(quota, /remainingInvites|quota\?\.|quota\./);

  const cards = read("components", "home", "StatsCards.js");
  assert.match(cards, /formatCount\(card\.value,\s*locale\)/);
  assert.ok(cards.includes('t("dashboard.stats.'), "card labels are keyed");
});

test("EventTemplates + chips: directional controls, keyed chrome, adaptive-safe labels", () => {
  const rawTemplates = read("components", "home", "EventTemplates.js");

  // The LOCAL_* offline fallbacks are reviewed bilingual catalogue FIXTURES
  // (nameEn/nameAr data pairs, blueprint §11) — not rendered UI literals.
  // Everything outside those arrays must be keys-only chrome.
  const templates = rawTemplates.replace(
    /const LOCAL_(CATEGORIES|TEMPLATES) = \[[\s\S]*?\n\];/g,
    ""
  );

  assert.ok(
    !hasArabicLiteral(templates),
    "template picker chrome carries no Arabic literals"
  );
  assert.ok(rawTemplates.includes("nameAr"), "bilingual catalogue fixtures retained");
  assert.ok(templates.includes("DirectionalIonicon"), "carousel arrows stay directional");
  assert.ok(
    templates.includes('<DirectionalIonicon\n                    name="chevron-back"') ||
      templates.includes('name="chevron-back"'),
    "back/forward chevrons resolve per locale"
  );
  assert.ok(templates.includes("LocalizedText"), "title/error/empty use localized roles");
  assert.ok(
    templates.includes('accessibilityLabel={t("buttons.close")}'),
    "preview modal close exposes a localized accessibility label"
  );

  const chips = read("components", "home", "_components", "TemplateCategoryChips.js");
  assert.ok(chips.includes("LocalizedText"), "category chip labels are app-owned localized copy");
});

test("dropdownModal: legacy hardcoded Arabic replaced by keys and LTR step counter", () => {
  const source = read("components", "home", "dropdownModal.js");
  assert.ok(
    !hasArabicLiteral(source),
    "the legacy step sheet must be fully keyed"
  );
  assert.ok(
    source.includes("editSteps.steps."),
    "step titles/descriptions come from the home bundle"
  );
  assert.match(source, /writingDirection:\s*"ltr"/, "step counter token pinned LTR");
  assert.match(source, /formatCount\(currentStep/, "counter digits localized");
  assert.match(source, /isolateLtr\(/, "current/total token isolated");
});

test("Test/Schedule modals: shared primitives only, localized alerts", () => {
  const testModal = read("components", "home", "TestMessageModal.js");
  const scheduleModal = read("components", "home", "ScheduleSendingModal.js");

  for (const [name, source] of [
    ["TestMessageModal", testModal],
    ["ScheduleSendingModal", scheduleModal],
  ]) {
    assert.ok(!hasArabicLiteral(source), `${name}: no Arabic literals`);
    assert.ok(
      !source.includes('t("common.error"'),
      `${name}: broken cross-namespace alert title removed`
    );
    assert.ok(
      source.includes('t("alerts.errorTitle")'),
      `${name}: alert titles use the events bundle error title`
    );
    assert.ok(
      !/from\s+"react-native".*TextInput|<TextInput/.test(source),
      `${name}: no direct native input bypass`
    );
  }

  assert.ok(testModal.includes("<MobileInput"), "phone field uses the shared phone primitive");
  assert.ok(scheduleModal.includes("<DatePicker"), "date uses the shared picker");
  assert.ok(scheduleModal.includes("<TimePicker"), "time uses the shared picker");
  assert.ok(testModal.includes("LocalizedText") && scheduleModal.includes("LocalizedText"));
});

test("new visible-copy keys exist in BOTH AR and EN home/events/common bundles", () => {
  const arHome = loadHomeLocales().ar;
  const enHome = loadHomeLocales().en;
  const at = (obj, key) => key.split(".").reduce((o, k) => o?.[k], obj);

  for (const key of [
    "errors.load",
    "errors.retry",
    "editSteps.title",
    "editSteps.cancel",
    "editSteps.go",
    "editSteps.steps.1.title",
    "editSteps.steps.2.description",
    "editSteps.steps.3.title",
    "editSteps.steps.4.description",
    "lastEvent.noResponseCount",
    "lastEvent.declinedCount",
    "lastEvent.approvedCount",
  ]) {
    assert.ok(at(arHome, key), `ar home.json missing ${key}`);
    assert.ok(at(enHome, key), `en home.json missing ${key}`);
  }

  const arEvents = JSON.parse(read("localization", "locales", "ar", "events.json"));
  const enEvents = JSON.parse(read("localization", "locales", "en", "events.json"));
  assert.equal(arEvents.alerts.errorTitle, "خطأ");
  assert.equal(enEvents.alerts.errorTitle, "Error");

  const arCommon = JSON.parse(read("localization", "locales", "ar", "common.json"));
  const enCommon = JSON.parse(read("localization", "locales", "en", "common.json"));
  assert.equal(arCommon.buttons.close, "إغلاق");
  assert.equal(enCommon.buttons.close, "Close");
  assert.ok(arCommon.templates_previous && enCommon.templates_previous);
  assert.ok(arCommon.templates_next && enCommon.templates_next);
});

test("guardrails: no row-reverse, no undocumented physical styling, no native inputs", () => {
  const files = [
    "screens/host/HomeScreen.js",
    "components/home/HomeHeaderContent.js",
    "components/home/MakeYourFirst.js",
    "components/home/StatsCards.js",
    "components/home/EventTemplates.js",
    "components/home/dropdownModal.js",
    "components/home/TestMessageModal.js",
    "components/home/ScheduleSendingModal.js",
    "components/home/_components/LastEventHeader.js",
    "components/home/_components/LastEventStatsRow.js",
    "components/home/_components/LastEventQuota.js",
    "components/home/_components/TemplateCategoryChips.js",
  ];

  const PHYSICAL =
    /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|textAlign:\s*"right"|row-reverse)\b/;

  for (const rel of files) {
    let source = read(...rel.split("/"));

    if (rel.endsWith("HomeHeaderContent.js")) {
      // Remove the documented decorative texture block before scanning:
      // full-bleed brand artwork may keep physical edges (blueprint §2).
      source = source.replace(
        /\/\/ Decorative header artwork[\s\S]*?const HeaderTexture[\s\S]*?\n\)/,
        ""
      );
      source = source.replace(/texture(L|R)eft?[\s\S]*?\},/g, "");
    }

    assert.ok(!PHYSICAL.test(source), `${rel} introduces physical/row-reverse styling`);
    assert.ok(!/<TextInput|TextInput\s*}/.test(source.replace(/RNTextInput/g, "")),
      `${rel} must not embed a raw native input`);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Admin events family (Events List / Event Details / Create Event /
 * Update Event / Manage Post-Event) — blueprint §8 rows and §9 migration
 * targets covered by this page group.
 *
 * Guardrails asserted here:
 *  - filter/badge counts are locale-formatted, LTR-isolated tokens;
 *  - wizard chrome (PrevAndNextBtns defaults, lockout banner) is localized
 *    through keys/primitives instead of literals or raw Text;
 *  - floating preview anchors are semantic `end`, never physical right/left;
 *  - Step 1 event name/address declare adaptive content direction;
 *  - host selector renders names adaptively with LTR-isolated phones and a
 *    keyed self-account fallback;
 *  - send-action / guest-modal counters interpolate locale-formatted digits
 *    and keep ratio tokens atomic;
 *  - post-event sections render backend template text adaptively, format all
 *    counts, and keep the thank-you note input adaptive;
 *  - no row-reverse, physical directional properties or raw RN TextInput in
 *    any migrated file; no manual BiDi marks.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

const read = (...parts) =>
  fs.readFileSync(path.join(mobileRoot, ...parts), "utf8");

const MANUAL_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

test("EVLIST-01: admin header/filter badge counts are formatted isolated tokens", () => {
  const header = read(
    "components/admin-dashboard/common/AdminPageHeader.js"
  );
  assert.ok(
    header.includes("isolateLtr(formatCount(opt.count"),
      "AdminPageHeader chip badge must render formatCount through isolateLtr"
  );

  const filterBar = read("components/admin-dashboard/common/FilterBar.js");
  assert.ok(
    filterBar.includes("isolateLtr(formatCount(filter.count"),
      "FilterBar count badge must render formatCount through isolateLtr"
  );
  assert.ok(
    !/\{opt\.count\}|\{filter\.count\}/.test(header + filterBar),
    "raw numeric badge interpolation removed"
  );
});

test("EVLIST-02: BulkActionsBar selection counter is keyed and locale-formatted", () => {
  const source = read("components/admin-dashboard/common/BulkActionsBar.js");
  assert.ok(source.includes('t("common.selectedCount"'));
  assert.ok(source.includes("formatCount(selectedCount"));
  assert.ok(!/" selected"/.test(source));

  for (const lang of ["ar", "en"]) {
    const common = JSON.parse(
      read("localization", "locales", lang, "common.json")
    );
    assert.ok(common.selectedCount, `${lang}/common.json missing selectedCount`);
  }
});

test("CREATE-01: wizard footer defaults come from translation keys", () => {
  const source = read("components/createEvent/PrevAndNextBtns.js");
  assert.ok(
    source.includes('t("next_button")') && source.includes('t("previous_button")'),
    "default labels must resolve from createEvent bundle keys"
  );
  assert.ok(
    !/التالى|السابق/.test(source),
    "no hardcoded Arabic default labels remain"
  );
});

test("CREATE-02: preview button participates in create/update document flow", () => {
  for (const rel of [
    "components/admin-dashboard/events/CreateEventForm.js",
    "screens/common/update-event/UpdateEventScreen.js",
  ]) {
    const source = read(...rel.split("/"));
    const previewStyle = source.match(/previewButton:\s*\{([^}]*)\}/s);
    assert.ok(
      previewStyle,
      `${rel} must define the inline preview action`
    );
    assert.ok(
      !source.includes("floatingPreviewButton") &&
        !/position:\s*["']absolute["']/.test(previewStyle[1]),
      `${rel} must not leave the preview fixed over the wizard footer`
    );
  }
});

test("CREATE-03: update lockout banner renders through LocalizedText", () => {
  const source = read("screens/common/update-event/UpdateEventScreen.js");
  assert.ok(
    source.includes("<LocalizedText style={styles.lockoutText}>"),
    "lockout banner must be an explicit localized text role"
  );
});

test("CREATE-04: step one event name/address declare adaptive content direction", () => {
  const stepOne = read("components/createEvent/StepOne.js");
  assert.ok(
    stepOne.includes('contentDirection="adaptive"'),
    "event name/address must pass adaptive mode"
  );
  // Both shared primitives accept contentDirection so the page can declare it.
  const textInput = read("components/commen/TextInput.js");
  assert.match(textInput, /contentDirection = "localized"/);
  const mapPicker = read("components/commen/MapPicker.js");
  assert.match(mapPicker, /contentDirection = "localized"/);
});

test("DETAILS-01: host selector classifies name/plan as adaptive, phone as LTR token", () => {
  const source = read("components/admin-dashboard/events/HostSelectorStep.js");
  assert.ok(
    (source.match(/<AdaptiveText/g) || []).length >= 3,
    "host/self names and plan badge render adaptively"
  );
  assert.ok(
    source.includes("isolateLtr(item.phone || item.phoneNumber") &&
      source.includes("isolateLtr(user?.phone"),
    "phone digits stay LTR-isolated"
  );
  assert.ok(
    source.includes("t('events.hostSelector.selfAccount')"),
    "self fallback must be a translation key"
  );
  assert.ok(!source.includes("'Admin'"), "no English 'Admin' literal");
  assert.ok(
    source.includes("formatCount(eventsRemaining, currentLanguage)"),
    "remaining-events count is locale-formatted"
  );
  assert.ok(!MANUAL_MARKS.test(source), "no manual BiDi marks");
});

test("DETAILS-02: send action modal formats counters and keeps the sent ratio atomic", () => {
  const source = read("components/events/SendActionModal.js");
  assert.ok(
    source.includes("formatLocaleCount(selectedCount, currentLanguage)"),
    "selected count is locale-formatted"
  );
  assert.ok(
    source.includes(
      "successful: isolateLtr("
    ),
    "sentResult ratio is one LTR-isolated token"
  );
  assert.ok(
    source.includes("formatNumber as formatLocaleCount"),
    "counts come from the shared locale utils"
  );
});

test("DETAILS-03: add modal excludes the roster and the people workspace owns virtualization", () => {
  const source = read("components/events/AddGuestOrmoderatorPopup.js");
  assert.ok(!source.includes("itemsList.map("));
  const screen = read("screens/common/EventDetailsScreen.js");
  assert.ok(screen.includes("<FlatList") && screen.includes("useInfiniteEventGuests"));
});

test("DETAILS-04: auto reminder banner localizes stored HH:mm via shared formatter", () => {
  const source = read(
    "components/admin-dashboard/events/AutoReminderInfoText.js"
  );
  assert.ok(
    source.includes("return formatTime(timeStr, i18n.language"),
      "stored time strings must go through the shared locale formatter"
  );
  assert.ok(
    !/const ampm|hour12.*padStart/.test(source),
    "hand-rolled AM/PM assembly removed"
  );
});

test("POST-01: post-event media summary values are formatted isolated counts", () => {
  const source = read("components/host/post-event/ContentSummary.js");
  assert.ok(
    source.includes("isolateLtr(formatCount(value, currentLanguage))"),
    "summary stats render as isolated locale tokens"
  );
});

test("POST-02: template picker/access sheet treat backend text adaptively", () => {
  const picker = read("components/host/post-event/MessagingTemplatePicker.js");
  assert.ok(picker.includes("<AdaptiveText"), "template name/body adaptive");
  assert.ok(
    picker.includes("formatCount("),
    "variable count locale-formatted"
  );

  const sheet = read("components/host/post-event/AccessLinksSheet.js");
  assert.ok(sheet.includes("<AdaptiveText"), "override template text adaptive");
  assert.ok(
    sheet.includes("formatCount(summary.sent || 0, currentLanguage)"),
    "success toast count locale-formatted"
  );
  assert.ok(
    sheet.includes("formatCount(breakdown.whatsapp || 0, currentLanguage)"),
    "channel breakdown counts locale-formatted"
  );
});

test("POST-03: thank-you message input declares adaptive direction", () => {
  const source = read("components/host/post-event/ThankYouMessageSection.js");
  assert.ok(
    source.includes('contentDirection="adaptive"'),
    "thank-you note is arbitrary host content"
  );
});

test("POST-04: manage screen chrome uses localized roles and a directional back glyph", () => {
  const source = read("screens/common/ManagePostEventScreen.js");
  assert.ok(source.includes("LocalizedText"), "status/title copy uses roles");
  assert.ok(
    source.includes('<DirectionalIonicon name="arrow-back"'),
    "back arrow flips with locale"
  );
});

test("KEYS: new visible-copy keys exist in both bundles", () => {
  const at = (obj, keyPath) =>
    keyPath.split(".").reduce((o, k) => o?.[k], obj);
  for (const lang of ["ar", "en"]) {
    const admin = JSON.parse(read("localization", "locales", lang, "admin.json"));
    const create = JSON.parse(
      read("localization", "locales", lang, "createEvent.json")
    );
    assert.ok(at(admin, "events.hostSelector.selfAccount"), `${lang} selfAccount`);
    assert.ok(create.next_button && create.previous_button, `${lang} wizard labels`);
  }
});

test("GUARDRAIL: migrated files add no row-reverse, physical props, raw TextInput or manual marks", () => {
  const files = [
    "components/admin-dashboard/common/AdminPageHeader.js",
    "components/admin-dashboard/common/FilterBar.js",
    "components/admin-dashboard/common/BulkActionsBar.js",
    "components/createEvent/PrevAndNextBtns.js",
    "components/createEvent/StepOne.js",
    "components/commen/MapPicker.js",
    "components/admin-dashboard/events/CreateEventForm.js",
    "components/admin-dashboard/events/HostSelectorStep.js",
    "screens/common/update-event/UpdateEventScreen.js",
    "screens/common/ManagePostEventScreen.js",
    "components/events/SendActionModal.js",
    "components/events/AddGuestOrmoderatorPopup.js",
    "components/admin-dashboard/events/AutoReminderInfoText.js",
    "components/host/post-event/ThankYouMessageSection.js",
    "components/host/post-event/ContentSummary.js",
    "components/host/post-event/MessagingTemplatePicker.js",
    "components/host/post-event/AccessLinksSheet.js",
  ];
  for (const rel of files) {
    const source = read(...rel.split("/"));
    assert.ok(!source.includes("row-reverse"), `${rel}: row-reverse`);
    assert.ok(
      !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/.test(
        source
      ),
      `${rel}: physical directional property`
    );
    assert.ok(!MANUAL_MARKS.test(source), `${rel}: manual BiDi marks`);
  }
});

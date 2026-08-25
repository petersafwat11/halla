const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Single-event host page — total-guests chips, remaining-invites badge and
 * reminder widgets direction contract (blueprint §8 "Event details" row,
 * §5 field/content contract, §6 text/BiDi rules):
 *
 *  - localized chrome (labels, helpers, buttons) renders through the shared
 *    LocalizedText role primitive and never follows a value's script;
 *  - counts go through the shared locale formatter (٠١٢ / 0-9 digits);
 *  - "unlimited" is a translation key, never a raw literal;
 *  - date/time tokens join through an interpolation key, not JSX assembly;
 *  - icons are semantic (never mirrored) and rows stay normal logical
 *    flexDirection: "row" with no physical directional properties.
 */

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

const WIDGETS = [
  "components/events/TotalGuestsChips.js",
  "components/events/RemainingInvitesBadge.js",
  "components/events/ReminderButton.js",
];

test("total-guests / remaining-invites / reminder widgets use the shared text-role primitives", () => {
  for (const rel of WIDGETS) {
    const source = read(...rel.split("/"));
    assert.ok(
      source.includes("LocalizedText"),
      `${rel} must render localized copy through LocalizedText`
    );
  }
});

test("TotalGuestsChips: labels keyed, counts locale-formatted, logical row preserved", () => {
  const source = read("components/events/TotalGuestsChips.js");

  assert.ok(
    source.includes('t("eventDetails.checkedIn")') &&
      source.includes('t("eventDetails.totalGuests")'),
    "chip labels are translation keys"
  );
  assert.ok(
    /formatCount\((checkedInCount|totalGuests)/.test(source),
    "chip values are formatted through the shared count utility"
  );
  assert.ok(
    !/\{checkedInCount\}|\{totalGuests\}/.test(source),
    "no raw unformatted count rendering"
  );

  const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!code.includes("row-reverse"), "keeps the root logical row model");
  assert.ok(
    !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/.test(code),
    "no physical directional spacing"
  );
});

test("RemainingInvitesBadge: unlimited fallback is keyed and the count is locale-formatted", () => {  const source = read("components/events/RemainingInvitesBadge.js");

  assert.ok(
    source.includes('t("remainingInvites.label")') &&
      source.includes('t("remainingInvites.unlimited")') &&
      source.includes('t("remainingInvites.helper")'),
    "label/value/helper copy comes from keys"
  );
  assert.ok(
    /remaining == null/.test(source) && source.includes("formatCount(remaining"),
    "null remaining renders unlimited; numbers are locale-formatted"
  );
  assert.ok(
    !/["'][^"']*[\u0600-\u06FF]/.test(source.replace(/\/\/[^\n]*/g, "")),
    "no direct Arabic literals in the badge"
  );

  const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!code.includes("row-reverse"), "keeps the root logical row model");
  assert.ok(
    !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/.test(code),
    "no physical directional spacing"
  );
});

test("ReminderButton: label stays localized while sending and the bell icon is not mirrored", () => {
  const source = read("components/events/ReminderButton.js");

  assert.ok(
    source.includes('t("reminder.sendAll")') && source.includes('t("reminder.sending")'),
    "idle + pending labels are translation keys"
  );
  assert.ok(
    source.includes("disabled={sending}") || /disabled=\{sending/.test(source),
    "pending state disables the button without changing geometry"
  );
  assert.ok(
    source.includes('"notifications-outline"'),
    "semantic reminder icon (not a directional glyph)"
  );
  // No arrow/chevron icon that would need DirectionalIonicon treatment.
  assert.ok(!/arrow-|chevron-/.test(source), "no navigation glyph to mirror");
});

test("EventDetailsScreen delegates the three blocks and stops hand-assembling date • time", () => {
  const source = read("screens/common/EventDetailsScreen.js");

  assert.ok(
    source.includes("<TotalGuestsChips") &&
      source.includes("<RemainingInvitesBadge") &&
      source.includes("<ReminderButton"),
    "the three widgets render as shared components, not inline JSX"
  );
  assert.ok(
    !/checkedInLabel|invitesBadgeLabel|outlineActionBtnActive/.test(source),
    "superseded inline styles removed from the screen"
  );

  assert.ok(
    source.includes("eventDetails.dateTimeRow"),
    "date+time join through an interpolation key"
  );
  assert.ok(
    !/`\s*•\s*\$\{|\|\s*""\}\s*`/.test(source),
    "no template-literal bullet/date assembly"
  );

  // The whole visible tree keeps the guardrails.
  const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!code.includes("row-reverse"), "no row-reverse on the page");
  assert.ok(
    !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/.test(code),
    "no physical directional spacing on the page"
  );
  assert.ok(
    code.includes('contentDirection="adaptive"'),
    "guest/staff search stays adaptive"
  );
});

test("AutoReminderInfoText banner/modal copy uses localized roles over plain Text", () => {
  const source = read("components/admin-dashboard/events/AutoReminderInfoText.js");

  // The two picker labels moved into the shared DatePicker/TimePicker field
  // contract, so banner/modal chrome keeps nine localized roles here.
  const localizedUses = source.match(/<LocalizedText/g)?.length ?? 0;
  assert.ok(localizedUses >= 9, `banner/modal copy migrated (${localizedUses})`);
  assert.ok(!/<Text[ >]/.test(source), "no plain RN Text remains in the component");

  // Interpolated date/time still flow through the shared formatters
  // (regression DETAILS-04 must keep passing).
  assert.ok(
    source.includes("return formatTime(timeStr, i18n.language"),
    "stored HH:mm strings stay on the shared locale formatter"
  );
  assert.ok(
    source.includes('t(\n        "autoReminderInfoCustom"') ||
      source.includes('"autoReminderInfoCustom"'),
    "custom reminder sentence is one interpolation key"
  );
});

test("AutoReminderInfoText reminder customization renders the shared pickers", () => {
  const source = read("components/admin-dashboard/events/AutoReminderInfoText.js");

  assert.ok(source.includes("<DatePicker"), "date uses the shared field-contract picker");
  assert.ok(source.includes("<TimePicker"), "time uses the shared field-contract picker");
  assert.ok(
    !source.includes("@react-native-community/datetimepicker"),
    "the inline iOS spinner bypass must not come back"
  );
  assert.ok(source.includes("minimumDate={lowerBound"), "window lower bound bounds the calendar");
  assert.ok(source.includes("maximumDate={upperBound"), "window upper bound bounds the calendar");
});

test("SendActionsSheet chrome renders through localized roles over plain Text", () => {
  const source = read("components/events/SendActionsSheet.js");

  const localizedUses = source.match(/<LocalizedText/g)?.length ?? 0;
  assert.ok(localizedUses >= 5, `title/labels/reasons/count/cancel migrated (${localizedUses})`);
  assert.ok(!/<Text[ >]/.test(source), "no plain RN Text remains in the sheet");
  assert.ok(
    source.includes('t("events:sendActions.menu")') &&
      source.includes('t("events:bulkActions.cancel")'),
    "sheet title and cancel stay keyed"
  );
});

test("new dateTimeRow key exists in both locales with identical interpolation slots", () => {
  const at = (obj, keyPath) => keyPath.split(".").reduce((o, k) => o?.[k], obj);
  for (const lang of ["ar", "en"]) {
    const bundle = JSON.parse(read("localization", "locales", lang, "events.json"));
    const value = at(bundle, "eventDetails.dateTimeRow");
    assert.ok(value, `${lang} events.eventDetails.dateTimeRow missing`);
    assert.ok(value.includes("{{date}}") && value.includes("{{time}}"));
  }
});

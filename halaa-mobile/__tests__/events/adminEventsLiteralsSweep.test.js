import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Admin events family — visible-copy literal sweep (blueprint §12 #6:
 * "direct Arabic UI copy has been removed from bilingual host surfaces").
 *
 * Locked in here for the Events List / Event Details / Create Event /
 * Update Event / Manage Post-Event trees:
 *  - every visible application copy resolves through a translation key;
 *    inline AR/EN fallback strings (positional t() args, defaultValue
 *    literals, [key, fallback] pairs) are gone;
 *  - the admin navigator's stack titles are keyed, never per-language
 *    literals;
 *  - floating preview labels and update banners render through
 *    LocalizedText roles;
 *  - template/category/reply dictionaries resolve via keys, not embedded
 *    Arabic maps;
 *  - no row-reverse / physical directional properties / manual BiDi marks /
 *    raw RN TextInput were (re)introduced by this sweep.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

const read = (...parts) =>
  fs.readFileSync(path.join(mobileRoot, ...parts), "utf8");

const STRIP_COMMENTS = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const ARABIC = /[\u0600-\u06FF]/;

// Files whose entire visible copy must be key-driven (no script-ambiguous
// parsing data inside).
const SWEPT_FILES = [
  "screens/common/EventDetailsScreen.js",
  "components/events/SendActionsSheet.js",
  "components/events/SendActionModal.js",
  "components/events/AddGuestOrmoderatorPopup.js",
  "components/admin-dashboard/events/AdminEventList.js",
  "components/admin-dashboard/events/AdminEventListItem.js",
  "components/admin-dashboard/events/AutoReminderInfoText.js",
  "components/createEvent/StepFour.js",
  "components/createEvent/EventSummary.js",
  "components/createEvent/PreviewInvitation.js",
  "components/createEvent/EditGuestOrModeratorsModal.js",
  "components/createEvent/LimitReachedView.js",
];

test("SWEEP-01: no positional string fallbacks left in t()/tCreate() calls", () => {
  const POSITIONAL = /\bt(?:Create)?\(\s*['"][\w.:-]+['"]\s*,\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*[),]/;
  for (const rel of SWEPT_FILES) {
    const src = STRIP_COMMENTS(read(rel));
    assert.ok(
      !POSITIONAL.test(src),
      `${rel}: t("key", "literal") fallback removed — rely on locale bundles`
    );
  }
});

test("SWEEP-02: no string-literal defaultValue options remain", () => {
  const DV_LITERAL = /\bdefaultValue:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/;
  for (const rel of SWEPT_FILES) {
    const src = STRIP_COMMENTS(read(rel));
    assert.ok(
      !DV_LITERAL.test(src),
      `${rel}: defaultValue must not embed an inline literal (dynamic error-key variables are allowed)`
    );
  }
});

test("SWEEP-03: no raw Arabic UI copy outside reviewed parsing data", () => {
  for (const rel of SWEPT_FILES) {
    const src = STRIP_COMMENTS(read(rel));
    assert.ok(!ARABIC.test(src), `${rel}: direct Arabic UI literal remains`);
  }

  // StepOne keeps Arabic AM/PM period tokens as PARSING DATA only (they
  // normalise stored times); they must never appear as rendered copy.
  const stepOne = STRIP_COMMENTS(
    read("components/createEvent/StepOne.js")
  ).replace(
    /\(AM\|PM\|[^)]*\)|period\s*===\s*"[^"]*"/g,
    '""'
  );
  assert.ok(
    !ARABIC.test(stepOne),
    "StepOne: Arabic outside AM/PM parsing expressions"
  );
});

test("SWEEP-04: send sheet/modal label tables are plain keys, consumed without spread", () => {
  const sheet = read("components/events/SendActionsSheet.js");
  const modal = read("components/events/SendActionModal.js");

  assert.ok(!/\[\s*"events:/.test(sheet + modal), "[key, fallback] pairs removed");
  assert.ok(!sheet.includes("t(..."), "sheet spreads no fallback tuples");
  assert.ok(!modal.includes("t(..."), "modal spreads no fallback tuples");
  assert.ok(
    !modal.includes("titleFallback"),
    "modal title destructure replaced by a single keyed lookup"
  );
});

test("SWEEP-05: step four dictionaries resolve through event_types/auto-reply keys", () => {
  const src = read("components/createEvent/StepFour.js");
  assert.ok(
    !src.includes("CATEGORY_LABELS_AR"),
    "Arabic category-label map deleted — event_types.* keys are authoritative"
  );
  assert.ok(
    src.includes("t(`event_types.${cat}`)"),
    "category labels resolve via interpolation keys"
  );
  assert.ok(
    !src.includes(".fallback") && !src.includes("defaultText"),
    "REPLY_TABS fallback/defaultText fields removed"
  );
});

test("SWEEP-06: admin navigator stack titles are translation keys in both bundles", () => {
  const nav = read("navigation/AdminNavigator.js");
  assert.ok(
    !ARABIC.test(nav),
    "AdminNavigator: per-language title literals removed"
  );

  const titles = [
    "hosts",
    "hostDetails",
    "events",
    "eventDetails",
    "createEvent",
    "updateEvent",
    "managePostEvent",
    "tickets",
    "ticketDetails",
  ];
  for (const key of titles) {
    assert.ok(
      nav.includes(`admin:screenTitles.${key}`),
      `stack title ${key} must use admin:screenTitles.${key}`
    );
  }

  for (const lang of ["ar", "en"]) {
    const admin = JSON.parse(
      read("localization", "locales", lang, "admin.json")
    );
    for (const key of titles) {
      assert.ok(
        admin.screenTitles?.[key],
        `${lang}/admin.json missing screenTitles.${key}`
      );
    }
  }
});

test("SWEEP-07: floating preview labels + update banner use LocalizedText roles", () => {
  const createForm = read("components/admin-dashboard/events/CreateEventForm.js");
  assert.ok(
    createForm.includes("<LocalizedText style={styles.floatingPreviewText}>"),
    "create floating preview label is a localized role"
  );

  const update = read("screens/common/update-event/UpdateEventScreen.js");
  assert.ok(
    update.includes("<LocalizedText style={styles.floatingPreviewText}>"),
    "update floating preview label is a localized role"
  );
  assert.ok(
    !/\bText\b/.test(update.split("\n").find((l) => l.includes("floatingPreviewText")) || ""),
    "update preview label is not a plain Text node"
  );
});

test("GUARDRAIL-SWEEP: migrated files stay logical, primitive-based and mark-free", () => {
  const MANUAL_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
  const files = [
    ...SWEPT_FILES,
    "components/admin-dashboard/events/CreateEventForm.js",
    "screens/common/update-event/UpdateEventScreen.js",
    "navigation/AdminNavigator.js",
  ];
  for (const rel of files) {
    const source = read(rel);
    assert.ok(!source.includes("row-reverse"), `${rel}: row-reverse`);
    assert.ok(
      !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/.test(
        source
      ),
      `${rel}: physical directional property`
    );
    assert.ok(!MANUAL_MARKS.test(source), `${rel}: manual BiDi marks`);
    if (!rel.startsWith("navigation/")) {
      // Raw-bypass check: the react-native import block must not export
      // TextInput (shared commen/DirectionalTextInput primitives aliasing
      // the name are fine).
      const rnImport = source.match(
        /import\s*\{([^}]*)\}\s*from\s*"react-native"/s
      );
      const rnNames = rnImport ? rnImport[1] : "";
      assert.ok(
        !/\bTextInput\b/.test(rnNames),
        `${rel}: raw RN TextInput bypass`
      );
    }
  }
});

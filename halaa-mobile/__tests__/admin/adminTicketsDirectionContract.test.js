const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Admin dashboard Tickets List + Ticket Details iOS direction contract
 * (docs/implementation/HOST_IOS_DIRECTION_BLUEPRINT.md §8 tickets rows,
 * §5 field/content-direction contract, §6 text/BiDi rules, §7 icon rules).
 *
 * Source-reading assertions follow the repository's established direction
 * contract conventions (tickets/settings/vendor/events contracts).
 */
const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

const ADMIN_TICKETS_TREE = [
  "screens/admin/admin-dashboard/AdminTicketsScreen.js",
  "screens/admin/admin-dashboard/TicketDetailsScreen.js",
  "components/admin-dashboard/tickets/TicketListItem.js",
  "components/admin-dashboard/tickets/TicketHeroCard.js",
  "components/admin-dashboard/tickets/TicketSectionCard.js",
  "components/admin-dashboard/tickets/ModeratorList.js",
  "components/admin-dashboard/tickets/ResolveTicketModal.js",
  "components/admin-dashboard/tickets/AssignTicketModal.js",
];

test("admin tickets tree: no row-reverse and no direct native TextInput bypass", () => {
  for (const rel of ADMIN_TICKETS_TREE) {
    const source = read(rel);
    assert.ok(!source.includes("row-reverse"), `${rel} must not use flexDirection: row-reverse`);
    assert.ok(
      !/TextInput\s+as\s+\w+\}?\s*from\s+"react-native"/.test(source),
      `${rel} must not import the native TextInput directly`
    );
    // Inputs only through the shared directional primitive.
    if (/\bTextInput\b/.test(source)) {
      assert.ok(
        /from\s+".*DirectionalTextInput"/.test(source),
        `${rel} may only reference the shared DirectionalTextInput primitive`
      );
    }
  }
});

test("admin tickets tree: no physical directional spacing/borders", () => {
  const PHYSICAL =
    /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\s*:/;
  for (const rel of ADMIN_TICKETS_TREE.concat([
    "components/admin-dashboard/common/AdminListItem.js",
    "components/admin-dashboard/common/BulkActionsBar.js",
  ])) {
    const source = read(rel);
    const violations = source
      .split("\n")
      .map((line, idx) => ({ line: line.trim(), idx }))
      .filter(({ line }) => !line.startsWith("//") && !line.startsWith("*") && PHYSICAL.test(line));
    assert.deepEqual(
      violations,
      [],
      `${rel} must use logical start/end spacing only`
    );
  }
});

test("ResolveTicketModal: adaptive resolution field, localized chrome, LTR counter", () => {
  const modal = read("components/admin-dashboard/tickets/ResolveTicketModal.js");

  assert.match(
    modal,
    /contentDirection=\{CONTENT_DIRECTIONS\.ADAPTIVE\}/,
    "the resolution message is arbitrary user content → adaptive"
  );
  assert.ok(modal.includes("LocalizedText"), "title/subtitle/label/error/helper/warning must use the localized role");
  assert.ok(!/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(modal), "plain Text must not bypass the role primitives");

  // Counter role from the field contract: LTR-isolated at the logical end.
  assert.match(modal, /fieldDirection\.counter/, "counter must apply the shared LTR counter role");
  assert.match(modal, /isolateLtr\(`\$\{resolutionValue\.length\}/, "counter digits must be LTR-isolated");

  // Header mixes an intrinsically LTR #id token with an adaptive subject —
  // both must be isolated inside an interpolated translation string.
  assert.match(modal, /t\("tickets\.resolve\.subtitle"/);
  assert.match(modal, /ticketId:\s*isolateLtr\(/, "#id must be an LTR-isolated token");
  assert.match(modal, /subject:\s*isolateAuto\(/, "subject must be first-strong isolated");
  assert.ok(!modal.includes("Ticket #"), "hardcoded English header literal must be gone");
});

test("AssignTicketModal: adaptive note field, translated + isolated header", () => {
  const modal = read("components/admin-dashboard/tickets/AssignTicketModal.js");

  assert.match(modal, /contentDirection=\{CONTENT_DIRECTIONS\.ADAPTIVE\}/, "the assignment note is arbitrary user content → adaptive");
  assert.ok(modal.includes("LocalizedText"), "labels/helper/loading text must use the localized role");
  assert.match(modal, /t\("tickets\.assign\.subtitle"/);
  assert.match(modal, /ticketId:\s*isolateLtr\(/);
  assert.match(modal, /subject:\s*isolateAuto\(/);
  assert.ok(!modal.includes("Ticket #"), "hardcoded English header literal must be gone");
});

test("ModeratorList: adaptive names, LTR emails, localized empty state", () => {
  const list = read("components/admin-dashboard/tickets/ModeratorList.js");

  assert.match(list, /<AdaptiveText[^>]*styles\.moderatorName/, "moderator display name follows its own first-strong direction");
  assert.match(list, /<AdaptiveText[^>]*styles\.ltrToken[^>]*isolate=\{false\}/, "email keeps stable LTR glyph order without double isolation");
  assert.match(list, /isolateLtr\(moderator\.email\)/);
  assert.match(list, /<LocalizedText[^>]*styles\.emptyText/, "empty-state copy is app-authored and locale-directed");
  assert.ok(!/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(list), "plain Text must not bypass the role primitives");
});

test("TicketHeroCard: LTR ticket-number token, adaptive subject/category, localized chips + isolated date", () => {
  const hero = read("components/admin-dashboard/tickets/TicketHeroCard.js");

  assert.match(hero, /isolateLtr\(`#\$\{ticketNumber\}`\)/, "ticket number is an intrinsically LTR token");
  assert.match(hero, /styles\.heroTicketNum,\s*styles\.ltrToken/, "…pinned LTR so #/digits cannot reorder under RTL");
  assert.match(hero, /<AdaptiveText style=\{styles\.heroSubject\}>/, "subject resolves first-strong");
  assert.match(hero, /<AdaptiveText style=\{styles\.categoryChipText\}>/, "category chip value is backend content");
  assert.match(hero, /<LocalizedText[^>]*styles\.priorityChipText/, "priority label is app copy");
  assert.match(hero, /<LocalizedText[^>]*styles\.statusChipText/, "status label is app copy");
  assert.match(hero, /isolateAuto\(formattedDate\)/, "locale-formatted date is first-strong isolated");
  assert.match(hero, /marginStart:\s*"auto"/, "date hugs the logical end edge");
  assert.ok(!/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(hero));
});

test("TicketSectionCard: localized section title; InfoRow declares a per-row value mode", () => {
  const card = read("components/admin-dashboard/tickets/TicketSectionCard.js");

  assert.match(card, /<LocalizedText style=\{styles\.sectionTitle\}>\{title\}<\/LocalizedText>/, "section titles always follow the UI locale");
  assert.match(card, /mode = "adaptive"/, "values default to arbitrary-content handling");
  assert.match(card, /isLtrValue\s*=\s*mode === "ltr"/, "email/ID rows can pin stable LTR");
  assert.match(card, /isolateLtr\(value \?\? "—"\)/, "LTR values are isolated");
  assert.match(card, /<LocalizedText style=\{styles\.infoLabel\}>\{label\}<\/LocalizedText>/, "labels never inherit the value script");
  assert.match(card, /<AdaptiveText style=\{styles\.infoValue\}/, "adaptive values render through the shared primitive");
});

test("TicketListItem: details/chips classified (ltr ID, adaptive name/category, isolated date)", () => {
  const item = read("components/admin-dashboard/tickets/TicketListItem.js");

  assert.match(item, /text:\s*isolateLtr\(`#\$\{ticketNum\}`\),\s*ltr:\s*true/, "ticket number row is a pinned-LTR token");
  assert.match(item, /text:\s*ticket\.category,\s*adaptive:\s*true/, "category is backend content");
  assert.match(item, /text:\s*isolateAuto\(formatDate\(ticket\.createdAt,\s*currentLanguage\)\)/, "date is locale-formatted then first-strong isolated");
  assert.match(item, /adaptive:\s*true,\s*\n\s*\},\s*\n\s*\]\.filter\(Boolean\)[\s\S]{0,40}details =/, "assignee chip must be marked adaptive");
});

test("AdminListItem (shared): adaptive chip labels and LTR detail mode exist for backend values", () => {
  const listItem = read("components/admin-dashboard/common/AdminListItem.js");

  assert.match(listItem, /chip\.adaptive\s*\?\s*\(/, "chips can declare backend/user values");
  assert.match(listItem, /<AdaptiveText style=\{\[styles\.chipText,/, "backend chip values follow first-strong direction");
  assert.match(listItem, /d\.ltr\s*\?/, "details can pin intrinsically LTR tokens");
  assert.match(listItem, /ltrDetailText:\s*\{\s*writingDirection:\s*"ltr"/);
});

test("TicketDetailsScreen: adaptive bodies, interpolated meta line, explicit modes, labelled actions", () => {
  const screen = read("screens/admin/admin-dashboard/TicketDetailsScreen.js");

  // Free-text bodies are user/backend content.
  assert.match(screen, /<AdaptiveText style=\{styles\.messageText\}>/, "ticket message body");
  assert.match(screen, /<AdaptiveText style=\{styles\.resolutionText\}>/, "resolution body");
  assert.match(screen, /<AdaptiveText style=\{styles\.messageText\}>\{ticket\.assignmentNote\}/, "assignment note body");

  // The resolved-by sentence comes from i18next interpolation with isolated
  // tokens — never JSX concatenation of label + name + date.
  assert.match(screen, /t\("ticketDetails\.resolvedByMeta"/);
  assert.match(screen, /name:\s*isolateAuto\(resolvedBy\)/);
  assert.match(screen, /date:\s*isolateAuto\(formatDate\(ticket\.resolution\.at\)\)/);
  assert.ok(
    !/\{t\("ticketDetails\.resolvedBy"\)\}\s*\{resolvedBy\}/.test(screen),
    "old JSX-concatenated meta line removed"
  );

  // Detail rows declare their content modes.
  assert.match(screen, /label=\{t\("ticketDetails\.email"\)\}\s*value=\{ticket\.submittedBy\.email\}\s*mode="ltr"/, "email row pins LTR");
  assert.match(screen, /value=\{isolateAuto\(formatDate\(ticket\.createdAt,\s*true\)\)\}\s*mode="localized"/, "created row is a locale-formatted token");
  assert.match(screen, /value=\{submitterName\}\s*mode="adaptive"/, "submitter name is backend content");

  // Chrome stays localized; icon-only actions carry localized labels.
  assert.ok(screen.includes("<LocalizedText"), "center states/action labels use the localized role");
  assert.match(screen, /accessibilityLabel=\{t\("tickets\.resolve\.resolve"\)\}/, "top-bar icon-only resolve action has a localized label");
  assert.match(screen, /accessibilityLabel=\{t\("common\.close"\)\}/, "image-viewer close has a localized label");

  // Navigation chevrons flip with the locale; semantic icons stay unmirrored.
  assert.match(screen, /<DirectionalIonicon name="chevron-forward"/);
  assert.ok(!screen.includes("DirectionalIonicon name=\"checkmark") &&
            !screen.includes('DirectionalIonicon name="trash'), "semantic action glyphs are not direction-wrapped");

  assert.ok(!/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(screen), "plain Text must not bypass the role primitives");
});

test("BulkActionsBar (shared): selected count and action labels are localized roles", () => {
  const bar = read("components/admin-dashboard/common/BulkActionsBar.js");

  assert.match(bar, /<LocalizedText style=\{styles\.countText\}>/, "selected-count copy follows the UI locale");
  assert.match(bar, /<LocalizedText style=\{\[styles\.actionBtnText/, "bulk action labels follow the UI locale");
  assert.ok(!/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(bar));
});

test("locale bundles: new admin-ticket keys exist in both languages with balanced isolates", () => {
  const en = JSON.parse(read("localization/locales/en/admin.json"));
  const ar = JSON.parse(read("localization/locales/ar/admin.json"));

  const get = (obj, keyPath) =>
    keyPath.split(".").reduce((node, part) => (node ? node[part] : undefined), obj);

  for (const key of [
    "tickets.resolve.subtitle",
    "tickets.assign.subtitle",
    "tickets.resolve.resolutionLabel",
    "tickets.assign.selectModeratorLabel",
    "ticketDetails.resolvedByMeta",
    "ticketDetails.resolvedByMetaNoDate",
    "common.close",
  ]) {
    assert.ok(get(en, key) !== undefined, `en admin.${key} exists`);
    assert.ok(get(ar, key) !== undefined, `ar admin.${key} exists`);
  }

  // Subtitles embed an LTR #id token and an adaptive subject — the Arabic
  // string must keep its isolate marks balanced around interpolations.
  for (const arValue of [ar.tickets.resolve.subtitle, ar.tickets.assign.subtitle]) {
    assert.equal(
      (arValue.match(/\u2066/g) || []).length,
      0,
      "translation strings stay raw; isolation happens at the call site"
    );
  }

  // No Arabic UI literals leaked into the English bundle's ticket sections.
  const flat = [];
  (function walk(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const keyPath = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object") walk(v, keyPath);
      else flat.push([keyPath, String(v)]);
    }
  })(en.tickets, "tickets");
  (function walk(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const keyPath = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object") walk(v, keyPath);
      else flat.push([keyPath, String(v)]);
    }
  })(en.ticketDetails, "ticketDetails");

  const arabicLiterals = flat.filter(([, v]) => /[\u0600-\u06FF]/.test(v));
  assert.deepEqual(arabicLiterals.map(([k]) => k), [], "English ticket bundles must not contain Arabic UI literals");
});

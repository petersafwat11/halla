const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Events list + single-event pages (host & admin) direction contract.
 * Blueprint §8 rows "Event list" / "Event details" / §9 Priority 1-3 items
 * that live inside this page tree:
 *
 *  - backend/user values (event titles, guest/staff names) render adaptively;
 *  - counts/dates are formatted + isolated tokens, never JSX concatenation;
 *  - every visible application copy goes through translation keys;
 *  - phones stay LTR-isolated while their labels stay localized;
 *  - search inputs declare adaptive content direction;
 *  - no row-reverse, no new physical directional properties, and no direct
 *    native TextInput bypasses were introduced by this migration.
 */

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

const loadLocales = () => ({
  ar: JSON.parse(read("localization", "locales", "ar", "events.json")),
  en: JSON.parse(read("localization", "locales", "en", "events.json")),
});

test("EventDetailsScreen: backend values are adaptive, chrome stays localized", () => {
  const screen = read("screens", "common", "EventDetailsScreen.js");

  // Event titles and host names are arbitrary backend content.
  const adaptiveUses = screen.match(/<AdaptiveText/g)?.length ?? 0;
  assert.ok(
    adaptiveUses >= 2,
    `event title and host name must render adaptively (${adaptiveUses})`
  );

  // Search over guest/staff names follows first-strong once typed.
  assert.ok(
    screen.includes('contentDirection="adaptive"'),
    "guest/moderator search must declare adaptive content direction"
  );
  assert.ok(
    !screen.includes('useInputDirection("localized")'),
    "manual localized style patch replaced by the shared primitive"
  );

  // Tab counts come from interpolation keys — parentheses cannot BiDi-spill.
  assert.ok(
    screen.includes("guestsTabCount") && screen.includes("moderatorsTabCount"),
    "tab labels must use count interpolation keys"
  );
  assert.ok(
    !/\(\s*\{?\s*formatLocaleCount/.test(screen),
    "no hand-built '(count)' concatenation around formatted counts"
  );
});

test("GuestListItem/ModeratorListItem: names adaptive, phones LTR, alerts keyed", () => {
  for (const rel of [
    "components/events/GuestListItem.js",
    "components/events/ModeratorListItem.js",
  ]) {
    const source = read(...rel.split("/"));
    assert.ok(
      source.includes("AdaptiveText"),
      `${rel} renders person names adaptively`
    );
    assert.ok(
      source.includes("isolateLtr(guest.phone)") ||
        source.includes("isolateLtr(moderator.phone)"),
      `${rel} keeps phone digits LTR-isolated`
    );

    // Every Alert string argument must be a t(...) call, never a raw literal.
    const alertBodies = source.match(/Alert\.alert\([\s\S]*?(?:\]\)|\}\);|\);)/g) ?? [];
    for (const body of alertBodies) {
      assert.ok(
        body.includes("t("),
        `${rel}: every Alert title/button must be localized\n${body}`
      );
      assert.ok(
        !/["'][\u0600-\u06FF]["']/.test(body.replace(/t\([^)]*\)/g, "")),
        `${rel}: raw Arabic UI literal inside an Alert`
      );
    }
  }
});

test("StatsCards + EventListItem: locale-authored copy comes from keys, not literals", () => {
  const cards = read("components", "events", "StatsCards.js");
  assert.ok(cards.includes("t(\"statsCards."), "stat card labels are translated");
  assert.ok(!/label:\s*"[^"]*[\u0600-\u06FF]/.test(cards), "no hardcoded Arabic stat labels");

  const item = read("components", "events", "EventListItem.js");
  assert.ok(item.includes("<AdaptiveText"), "event title is adaptive");
  assert.ok(
    item.includes("confirmedCount") &&
      item.includes("declinedCount") &&
      item.includes("noResponseCount"),
    "stats row uses interpolated label+count keys"
  );
  assert.ok(
    !/\}\s*\{formatCount\(/.test(item),
    "no JSX label+count concatenation in the stats row"
  );
});

test("MakeYourFirst empty state is fully localized", () => {
  const source = read("components", "home", "MakeYourFirst.js");
  assert.ok(source.includes("makeYourFirst.title"), "title uses a translation key");
  assert.ok(source.includes("makeYourFirst.subtitle"), "subtitle uses a translation key");
  assert.ok(source.includes("makeYourFirst.createButton"), "button uses a translation key");
  assert.ok(
    !/>\s*[^<>{}]*[\u0600-\u06FF]/.test(source.replace(/\/\/[^\n]*/g, "")),
    "no direct Arabic JSX text nodes remain"
  );
});

test("Admin event list rows render backend content adaptively with formatted counts", () => {
  const shared = read("components/admin-dashboard/common/AdminListItem.js");
  const adaptiveUses = shared.match(/<AdaptiveText/g)?.length ?? 0;
  assert.ok(adaptiveUses >= 3, `title/subtitle/details support adaptive rendering (${adaptiveUses})`);

  const item = read("components/admin-dashboard/events/AdminEventListItem.js");
  assert.ok(item.includes("events.details.guestsCount"), "guest count is an interpolation key");
  assert.ok(item.includes("events.details.confirmedCount"), "confirmed count is an interpolation key");
  assert.ok(item.includes("formatCount(totalGuests"), "counts are locale-formatted");
  assert.ok(
    !/\$\{totalGuests\}/.test(item) && !/\$\{confirmedGuests\}/.test(item),
    "no template-literal count concatenation"
  );
  assert.ok(
    item.includes("deleteConfirmBody") && item.includes("ConfirmMessage"),
    "destructive confirmations use authored message keys"
  );

  const list = read("components/admin-dashboard/events/AdminEventList.js");
  assert.ok(list.includes("bulkCancelConfirmBody") && list.includes("bulkDeleteConfirmBody"));
  assert.ok(
    !/\$\{ids\.length\}/.test(list),
    "bulk confirm bodies interpolate the count instead of concatenating"
  );
});

test("all new visible-copy keys exist in both AR and EN events/admin/createEvent bundles", () => {
  const arEvents = JSON.parse(read("localization", "locales", "ar", "events.json"));
  const enEvents = JSON.parse(read("localization", "locales", "en", "events.json"));

  const eventsKeys = [
    "statsCards.confirmed",
    "statsCards.declined",
    "statsCards.pending",
    "list.stats.confirmedCount",
    "list.stats.declinedCount",
    "list.stats.noResponseCount",
    "eventDetails.guestsTabCount",
    "eventDetails.moderatorsTabCount",
    "actions.cancel",
    "actions.delete",
    "actions.edit",
    "makeYourFirst.title",
    "makeYourFirst.subtitle",
    "makeYourFirst.createButton",
    "guestList.rotateQrTitle",
    "guestList.rotateQrBody",
    "guestList.revokeAccessTitle",
    "guestList.revokeAccessBody",
    "guestList.chooseAction",
    "guestList.close",
    "moderatorList.revokeConfirmBody",
    "moderatorList.alreadyRevoked",
  ];
  const at = (obj, key) => key.split(".").reduce((o, k) => o?.[k], obj);

  for (const key of eventsKeys) {
    assert.ok(at(arEvents, key), `ar events missing ${key}`);
    assert.ok(at(enEvents, key), `en events missing ${key}`);
  }

  for (const [lang, expected] of [
    ["ar", "المدعوون ({{count}})"],
    ["en", "Guests ({{count}})"],
  ]) {
    assert.equal(
      at(JSON.parse(read("localization", "locales", lang, "events.json")), "eventDetails.guestsTabCount"),
      expected
    );
  }

  const arAdmin = JSON.parse(read("localization", "locales", "ar", "admin.json"));
  const enAdmin = JSON.parse(read("localization", "locales", "en", "admin.json"));
  for (const key of [
    "activateConfirmMessage",
    "suspendConfirmMessage",
    "deleteConfirmBody",
    "guestsCount",
    "confirmedCount",
    "bulkCancelConfirmBody",
    "bulkDeleteConfirmBody",
  ]) {
    assert.ok(arAdmin.events.details[key], `ar admin.events.details missing ${key}`);
    assert.ok(enAdmin.events.details[key], `en admin.events.details missing ${key}`);
  }

  const arCreate = JSON.parse(read("localization", "locales", "ar", "createEvent.json"));
  const enCreate = JSON.parse(read("localization", "locales", "en", "createEvent.json"));
  assert.ok(arCreate.current_guests_count && enCreate.current_guests_count);
  assert.ok(arCreate.current_moderators_count && enCreate.current_moderators_count);
});

test("no row-reverse or physical directional styles in the migrated files", () => {
  const files = [
    "screens/common/EventDetailsScreen.js",
    "components/events/GuestListItem.js",
    "components/events/ModeratorListItem.js",
    "components/events/EventListItem.js",
    "components/events/EventList.js",
    "components/events/StatsCards.js",
    "components/events/SendActionsSheet.js",
    "components/events/SendActionModal.js",
    "components/events/AddGuestOrmoderatorPopup.js",
    "components/home/MakeYourFirst.js",
    "components/admin-dashboard/common/AdminListItem.js",
    "components/admin-dashboard/events/AdminEventListItem.js",
    "components/admin-dashboard/hosts/HostSectionCard.js",
  ];
  for (const rel of files) {
    const source = read(...rel.split("/"));
    assert.ok(!source.includes("row-reverse"), `${rel} introduces row-reverse`);
    assert.ok(
      !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|textAlign:\s*"right"|left:\s*\d|right:\s*\d)\b/.test(
        source
      ),
      `${rel} contains physical directional styling`
    );
  }
});

/**
 * Blueprint §8 rows "Create event shell" / "Create/update Step 5 / summary"
 * and §9 Priority 1-3 follow-ups for the create/update wizard tree.
 */

test("EventSummary renders backend values adaptively with authored count/date strings", () => {
  const source = read("components", "createEvent", "EventSummary.js");

  // Event name, invitation body and address are arbitrary user/backend
  // content → AdaptiveText (first-strong), never page-locale forced.
  const adaptiveUses = source.match(/<AdaptiveText/g)?.length ?? 0;
  assert.ok(adaptiveUses >= 3, `event name/invitation/address render adaptively (${adaptiveUses})`);

  // Invitee count is one interpolation key — no JSX concatenation.
  assert.ok(source.includes('t("invitees_count"'), "invitee count uses an interpolation key");
  assert.ok(!/\{guestList\.length\}\s*\{t\(/.test(source), "no JSX label+count concatenation");

  // Date/time tokens come from the shared locale helpers and join through a
  // key; the raw stored `h:mm AM` string is never rendered.
  assert.ok(
    source.includes("formatLocaleDate") && source.includes("formatLocaleTime"),
    "date/time formatted through shared locale helpers"
  );
  assert.ok(source.includes("summary_date_time"), "date+time join through an interpolation key");
  assert.ok(
    !/\$\{eventTime\}|\$\{dateStr\}/.test(source),
    "no template-literal date/time assembly"
  );
});

test("ListOfGuestsORModerators renders names/categories adaptively with keyed totals", () => {
  const source = read("components", "createEvent", "ListOfGuestsORModerators.js");
  const adaptiveUses = source.match(/<AdaptiveText/g)?.length ?? 0;
  assert.ok(adaptiveUses >= 2, `guest/moderator name + category badge adaptive (${adaptiveUses})`);
  assert.ok(
    source.includes("total_guests_count") && source.includes("total_moderators_count"),
    "sheet totals are per-type interpolation keys"
  );
  assert.ok(
    source.includes("formatCount(list.length"),
    "sheet totals locale-format their counts"
  );
  assert.ok(!/\{list\.length\}\s*\{/.test(source), "no JSX total concatenation");
});

test("create-event onboarding popup + limit view have zero direct UI literals", () => {
  const popup = read("components", "createEvent", "yourEventManagedByUsPopup.js");
  assert.ok(popup.includes("managed_popup_title"), "popup title uses a translation key");
  assert.ok(popup.includes("managed_popup_description"), "popup description uses a translation key");
  assert.ok(popup.includes("managed_popup_contact"), "popup primary action uses a translation key");
  assert.ok(popup.includes("managed_popup_skip"), "popup secondary action uses a translation key");
  assert.ok(
    !/>\s*[^<>{}]*[\u0600-\u06FF]/.test(popup.replace(/\/\/[^\n]*/g, "")),
    "no direct Arabic JSX text nodes remain in the popup"
  );

  const limitView = read("components", "createEvent", "LimitReachedView.js");
  // Fallback literals must live inside the defaultValue slot (never an `||`
  // literal that overrides a translated value in Arabic).
  for (const key of ["limitReachedView.title", "limitReachedView.message", "limitReachedView.goBack"]) {
    assert.ok(limitView.includes(key), `limit view references ${key}`);
  }
  assert.ok(
    !/\|\|\s*"[^"]*"/.test(limitView),
    "limit view must not override translations with || English literals"
  );
});

test("StepFive free-text fields declare adaptive content direction", () => {
  const source = read("components", "createEvent", "StepFive.js");
  const adaptiveInputs = source.match(/contentDirection="adaptive"/g)?.length ?? 0;
  assert.ok(adaptiveInputs >= 3, "invitation message, auto replies and host note are adaptive");
});

test("contacts import + import/export metadata follow the field/copy contract", () => {
  const contacts = read("components", "createEvent", "_components", "ContactsImportModal.js");
  const contactAdaptive = contacts.match(/contentDirection="adaptive"/g)?.length ?? 0;
  assert.ok(contactAdaptive >= 2, `search + category inputs declare adaptive (${contactAdaptive})`);
  assert.ok(contacts.includes("<AdaptiveText"), "device contact names render adaptively");

  const io = read("components", "createEvent", "_components", "ImportExportSection.js");
  assert.ok(io.includes("import_error_row"), "import error rows use an interpolation key");
  assert.ok(!/\{err\.row\}/.test(io.replace(/\{\s*row:\s*err\.row[\s\S]*?\}\)/g, "")), "no raw JSX row-number concatenation outside interpolation");

  const viewList = read("components", "createEvent", "_components", "ViewListButton.js");
  assert.ok(viewList.includes("guest_list_title_count"), "list button count lives inside the translation string");
  assert.ok(!/\(\s*\{count\}\s*\)/.test(viewList), "parentheses are not concatenated around the count in JSX");
});

test("EventFailureBanner support/retry copy is keyed with isolated embedded tokens", () => {
  const banner = read("components", "events", "EventFailureBanner.js");
  assert.ok(banner.includes("failureBanner.failed.retryError"), "retry error fallback is a translation key");
  assert.ok(banner.includes("supportContextWithReason"), "WhatsApp support message uses the authored key");
  assert.ok(banner.includes("isolateAuto(eventTitle)"), "embedded event title is BiDi-isolated");
  assert.ok(banner.includes("isolateLtr(eventId"), "embedded event ID stays an LTR token");
  assert.ok(
    !/`[^`]*\$\{eventTitle\}[^`]*`/.test(banner) &&
      !/Event ID: \$\{eventId\}/.test(banner),
    "no hand-built sentence with parentheses around backend tokens"
  );
  assert.ok(!/[\u0600-\u06FF]/.test(banner.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")),
    "no direct Arabic literals remain outside comments");
});

test("orphaned bilingual components were removed instead of patched", () => {
  for (const rel of [
    "components/events/TabsSearchAndFilters.js",
    "components/createEvent/_components/EventMetricsGrid.js",
    "components/createEvent/_components/WhatsAppInvitationPreview.js",
    "components/createEvent/eventTypeModal.js",
    "components/createEvent/StepTwoBtns.js",
  ]) {
    assert.equal(fs.existsSync(path.join(MOBILE_ROOT, ...rel.split("/"))), false, `${rel} must be deleted`);
  }
  const barrel = read("components", "events", "index.js");
  assert.ok(!barrel.includes("TabsSearchAndFilters"), "barrel no longer exposes TabsSearchAndFilters");
});

test("TopBar resolves title base direction first-strong while chrome stays localized", () => {
  const topBar = read("components", "plans", "TopBar.js");
  const code = topBar
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(topBar.includes("resolveStrongDirection(title"), "title base direction follows its first strong character");
  assert.ok(
    topBar.includes('resolveLabelDirection("localized"'),
    "bar chrome alignment keeps following the UI locale"
  );
  assert.ok(!code.includes("row-reverse"), "TopBar keeps logical row layout (no row-reverse style value)");
});

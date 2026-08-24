const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

test("TicketModal: subject and message use adaptive mode; chrome stays localized", () => {
  const modal = read("components/tickets/TicketModal.js");

  assert.ok(modal.includes("DirectionalTextInput"), "TicketModal must keep the shared direction-aware primitive");
  assert.ok(modal.includes("useFieldDirection"), "TicketModal must apply the field-direction contract to its chrome");
  assert.ok(
    modal.includes("CONTENT_DIRECTIONS.ADAPTIVE"),
    "TicketModal must declare the adaptive content mode"
  );
  // Subject AND message both resolve as arbitrary user text.
  const adaptiveUses = modal.split('contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}').length - 1;
  assert.ok(adaptiveUses >= 2, `subject + message must be adaptive, found ${adaptiveUses}`);

  // Attachment filename is user/backend content → AdaptiveText (first-strong
  // + isolate), not a plain Text.
  assert.match(modal, /<AdaptiveText[^>]*styles\.attachmentName/);
  assert.ok(!/isolateAuto\(attachment\.name\)/.test(modal), "isolation moved into the shared AdaptiveText primitive");

  // Every visible string is chrome (title/labels/errors/type options/buttons)
  // rendered through the shared localized role — no plain Text bypass.
  assert.ok(
    !/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(modal),
    "plain Text must not bypass the localized role primitives"
  );
  const localizedUses = modal.split("<LocalizedText").length - 1;
  assert.ok(
    localizedUses >= 10,
    `title/labels/errors/options/buttons must be LocalizedText, found ${localizedUses}`
  );

  // Icon-only close action: localized label + ≥44 px effective target.
  assert.match(modal, /accessibilityRole="button"/);
  assert.match(modal, /accessibilityLabel=\{t\("popup\.cancel"\)\}/);
  assert.match(modal, /hitSlop=\{\{[^}]*start:\s*2/);

  // No direct native TextInput bypass.
  assert.ok(!/from\s+"react-native"[\s\S]{0,80}TextInput/.test(modal) && !modal.includes("TextInput as RNTextInput"));
});

test("TicketRatingModal: full localized-text contract with an adaptive feedback field", () => {
  const rating = read("components/tickets/TicketRatingModal.js");

  assert.ok(rating.includes("LocalizedText"), "title/question/labels/errors/buttons must be LocalizedText");
  assert.ok(rating.includes("DirectionalTextInput"), "feedback must stay on the shared input primitive");
  assert.match(rating, /contentDirection=\{CONTENT_DIRECTIONS\.ADAPTIVE\}/);
  assert.ok(
    !/import\s+\{\s*[\s\S]*?\bText\b[\s\S]*?\}\s*from\s+"react-native"/.test(rating),
    "plain Text must not bypass the localized role primitives"
  );
});

test("rating star order is intentionally physical (1→5), pinned LTR in every locale", () => {
  for (const rel of [
    "components/tickets/TicketRatingModal.js",
    "components/tickets/TicketCard.js",
  ]) {
    const source = read(rel);
    assert.ok(
      /direction:\s*"ltr"/.test(source),
      `${rel} must pin its star row LTR so a numeric scale never mirrors by accident`
    );
  }

  const rating = read("components/tickets/TicketRatingModal.js");
  assert.ok(
    rating.includes("accessibilityLabel={t(`rating."),
    "each star needs a localized accessibility label"
  );
});

test("TicketCard: backend message is adaptive; date isolation is first-strong; copy is localized", () => {
  const card = read("components/tickets/TicketCard.js");

  assert.match(card, /<AdaptiveText[^>]*numberOfLines=\{2\}/);
  assert.ok(card.includes("AdaptiveText"), "ticket.message is user content and must follow its own first-strong direction");
  assert.ok(card.includes("LocalizedText"), "status/type/actions/attachment labels are app copy");
  assert.ok(card.includes("isolateAuto(formattedDate)"));
  assert.ok(!card.includes("isolateLtr(formattedDate)"));

  // Star display pinned physically; icons are semantic (no navigation glyphs
  // to flip in this tree).
  assert.ok(/direction:\s*"ltr"/.test(card));
});

test("TicketsScreen: empty state uses localized roles; FAB stays at logical end with a label", () => {
  const screen = read("screens/common/TicketsScreen.js");

  assert.ok(screen.includes("LocalizedText"), "empty-state copy must use the localized text role");
  assert.match(screen, /accessibilityLabel=\{t\("createTicket"\)\}/, "icon-only FAB needs a localized accessibility label");
  assert.match(screen, /end:\s*24/, "FAB anchors to the logical end edge");
  assert.ok(!/\bright:\s*24/.test(screen), "FAB must not anchor to the physical right edge");
});

test("tickets page introduces no row-reverse and no direct native inputs", () => {
  for (const rel of [
    "components/tickets/TicketModal.js",
    "components/tickets/TicketRatingModal.js",
    "components/tickets/TicketCard.js",
    "screens/common/TicketsScreen.js",
  ]) {
    const source = read(rel);
    assert.ok(!source.includes("row-reverse"), `${rel} must not use flexDirection: row-reverse`);
    assert.ok(
      !/TextInput\s+as\s+RNTextInput|from\s+"react-native";[\s\S]{0,200}\bTextInput\b/.test(source),
      `${rel} must not import the native TextInput directly`
    );
  }
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_ROOTS = ["components", "screens"];

/**
 * Native modals that contain editable controls must be presented through the
 * shared KeyboardSafeModalSheet (§12 rule 5). Files below are the remaining
 * owners from the §8.2 audit, pending their rollout wave (§14); each entry is
 * blocked until migrated. NEW modal+input files are NOT allowlisted — adding
 * one fails this test.
 */
const PENDING_MODAL_MIGRATIONS = new Map([
  // §8.2 Tickets (P1) — already have raw RN avoidance; adopt shared sheet.
  ["components/tickets/TicketModal.js", "P1 tickets → KeyboardSafeModalSheet"],
  ["components/tickets/TicketRatingModal.js", "P1 tickets → KeyboardSafeModalSheet"],
  // §8.2 Guest/category sheets (P0/P1).
  ["components/guests/ReuseGuestsModal.js", "P1 guest sheets → KeyboardSafeModalSheet"],
  ["components/guests/VCardImportModal.js", "P1 guest sheets → KeyboardSafeModalSheet"],
  ["components/events/AddGuestOrmoderatorPopup.js", "P1 guest popup → KeyboardSafeModalSheet"],
  // §8.2 Create Step 3 editor modal (P1).
  ["components/createEvent/StepThree.js", "P1 editor modal → shared aware owner"],
  // §8.2 Account/settings + portal (P1).
  ["components/settings/DeleteAccountSection.js", "P1 confirmation → centered sheet"],
  ["components/common/staff-portal/QRModal.js", "P1 QR card → centered sheet"],
  // §8.2 Map/location (P1).
  ["components/commen/MapPicker.js", "P1 search modal → KeyboardSafeModalSheet"],
  // Non-text pickers that merely embed a TextInput-like control incidentally.
  ["components/commen/colorPicker.js", "Inspect: color picker, no text focus flow"],
  // §8.2 Vendor modals (P2).
  ["components/vendor/home/AddServicePopup.js", "P2 vendor → KeyboardSafeModalSheet"],
  ["components/vendor/PhoneChangeOtpModal.js", "P2 OTP → centered card variant"],
  // §8.2 Admin creation/edit modals (P2). DiscountFormModal composes its
  // fields through a child component, so the inline-input scan cannot see it;
  // it is allowlisted because it still presents its own raw native Modal.
  ["components/admin-dashboard/businesses/AddBusinessModal.js", "P2 admin modal"],
  ["components/admin-dashboard/hosts/AddHostModal.js", "P2 admin modal"],
  ["components/admin-dashboard/moderators/AddModeratorModal.js", "P2 admin modal"],
  ["components/admin-dashboard/plans/EditPlanModal.js", "P2 admin modal"],
  ["components/admin-dashboard/common/ManagePlanModal.js", "P2 admin modal"],
  ["components/admin-dashboard/discounts/DiscountFormModal.js", "P2 admin modal (fields via child)"],
  ["components/admin-dashboard/notifications/SendNotificationModal.js", "P2 admin modal"],
  ["components/admin-dashboard/vendors/RatingModal.js", "P2 admin modal"],
  ["components/admin-dashboard/tickets/AssignTicketModal.js", "P2 admin modal"],
  ["components/admin-dashboard/tickets/ResolveTicketModal.js", "P2 admin modal"],
  ["screens/admin/admin-dashboard/PaymentDetailScreen.js", "P2 payment detail modal"],
  ["components/home/TestMessageModal.js", "P2 template test-message modal"],
]);

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(fullPath);
      return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
    });
}

function relFromRoot(file) {
  return path.relative(MOBILE_ROOT, file).replace(/\\/g, "/");
}

// Responsibility-based scan, not formatting-based: any editable-control name
// counts (raw RN TextInput or a shared input primitive).
const EDITABLE_CONTROL =
  /DirectionalTextInput|TextAreaInput|OTPInput|MobileInput|EmailInput|PasswordInput|\bTextInput\b/;

test("native Modal files with editable inputs use KeyboardSafeModalSheet (§12 rule 5)", () => {
  const violations = [];
  const staleAllowlistEntries = new Set(PENDING_MODAL_MIGRATIONS.keys());

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const rel = relFromRoot(file);
      if (rel.startsWith("components/commen/keyboard/")) continue;

      const content = fs.readFileSync(file, "utf8");
      const rendersRawModal = /<Modal/.test(content);

      // An allowlisted file stays "pending" while it still presents its own
      // native Modal (even when inputs are composed through children); the
      // entry only turns stale once it migrates off raw Modal entirely.
      if (PENDING_MODAL_MIGRATIONS.has(rel)) {
        if (rendersRawModal) staleAllowlistEntries.delete(rel);
        continue;
      }

      if (!rendersRawModal) continue;
      if (content.includes("KeyboardSafeModalSheet")) continue;
      if (!EDITABLE_CONTROL.test(content)) continue;

      violations.push(rel);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Native modals containing editable inputs must present through ` +
      `KeyboardSafeModalSheet (or be allowlisted with a documented reason):\n` +
      violations.join("\n")
  );

  assert.deepEqual(
    [...staleAllowlistEntries],
    [],
    `Stale allowlist entries — these files no longer render <Modal> with inputs. ` +
      `Remove them from PENDING_MODAL_MIGRATIONS:\n${[...staleAllowlistEntries].join("\n")}`
  );
});

test("first-slice screen owners migrated to the shared aware scroll view (§9)", () => {
  const OWNERS = [
    "components/admin-dashboard/events/CreateEventForm.js",
    "screens/common/update-event/UpdateEventScreen.js",
  ];

  for (const rel of OWNERS) {
    const content = fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");
    assert.match(
      content,
      /KeyboardAwareFormScrollView/,
      `${rel} must own its form scrolling through KeyboardAwareFormScrollView`
    );
    assert.doesNotMatch(
      content,
      /\bScrollView\b\s*(?=,|})/,
      `${rel} should not keep a parallel raw ScrollView import`
    );
  }
});

test("screenshot flow: ContactsImportModal presents via the shared sheet with sticky footer", () => {
  const rel = "components/createEvent/_components/ContactsImportModal.js";
  const content = fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

  assert.doesNotMatch(content, /<Modal/, "must not render its own native Modal");
  assert.match(content, /<KeyboardSafeModalSheet/);
  // Virtualized body preserved…
  assert.match(content, /<FlatList/);
  assert.match(content, /keyboardShouldPersistTaps="handled"/);
  // …with the category/Add footer as the dedicated sticky slot.
  assert.match(
    content,
    /const footer\s*=\s*phase === "list" \? \([\s\S]{0,600}categoryInput/,
    "the editable category field and Add action must live in the sheet footer slot"
  );
  // Selection dismisses the keyboard before closing (§10).
  assert.match(content, /Keyboard\.dismiss\(\)/);
});

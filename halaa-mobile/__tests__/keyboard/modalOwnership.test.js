const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_ROOTS = ["components", "screens"];

/**
 * Native modals that contain editable controls must be presented through the
 * shared KeyboardSafeModalSheet (§12 rule 5). The sole exemption below is a
 * reviewed full-screen editor whose top-anchored search has an explicit
 * keyboard contract. NEW modal+input files are not exempt — adding one fails.
 */
const RAW_MODAL_EXEMPTIONS = new Map([
  // §8.2 Map/location — SPECIALIZED EQUIVALENT (§12 rule 5): full-screen map
  // editor, not a form sheet. The search box is top-anchored (never obscured),
  // prediction rows stay virtualized, and selection/close dismiss the
  // keyboard before transitions. A bottom-sheet frame would break the map.
  ["components/commen/MapPicker.js", "P1 full-screen map editor → documented specialized owner"],
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
  const staleAllowlistEntries = new Set(RAW_MODAL_EXEMPTIONS.keys());

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const rel = relFromRoot(file);
      if (rel.startsWith("components/commen/keyboard/")) continue;

      const content = fs.readFileSync(file, "utf8");
      const rendersRawModal = /<Modal/.test(content);

      // An allowlisted file stays "pending" while it still presents its own
      // native Modal (even when inputs are composed through children); the
      // entry only turns stale once it migrates off raw Modal entirely.
      if (RAW_MODAL_EXEMPTIONS.has(rel)) {
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
      `Remove them from RAW_MODAL_EXEMPTIONS:\n${[...staleAllowlistEntries].join("\n")}`
  );
});

test("composed marketplace price inputs are owned by the shared sheet", () => {
  const content = fs.readFileSync(
    path.join(MOBILE_ROOT, "components/marketplace/FilterPopup.js"),
    "utf8"
  );

  assert.match(content, /<KeyboardSafeModalSheet\b/);
  assert.match(content, /<PriceRangeInputs\b/);
  assert.doesNotMatch(content, /<Modal\b/);
  assert.doesNotMatch(content, /<ScrollView\b/);
});

test("color picker custom hex input uses the shared centered sheet", () => {
  const content = fs.readFileSync(
    path.join(MOBILE_ROOT, "components/commen/colorPicker.js"),
    "utf8"
  );

  assert.match(content, /<KeyboardSafeModalSheet\b/);
  assert.match(content, /<RNTextInput\b/);
  assert.match(content, /\bcentered\b/);
  assert.doesNotMatch(content, /<Modal\b/);
});

test("category picker stays compact while retaining keyboard-safe ownership", () => {
  const content = fs.readFileSync(
    path.join(MOBILE_ROOT, "components/commen/CategoryPickerSheet.js"),
    "utf8"
  );

  assert.match(content, /<KeyboardSafeModalSheet\b/);
  assert.match(content, /maxHeightRatio=\{0\.58\}/);
  assert.match(content, /onShow=\{handleShow\}/);
});

test("full-screen MapPicker exemption keeps its top search and transition contract", () => {
  const content = fs.readFileSync(
    path.join(MOBILE_ROOT, "components/commen/MapPicker.js"),
    "utf8"
  );
  const searchIndex = content.indexOf("styles.searchWrap");
  const mapIndex = content.indexOf("styles.mapWrap");

  assert.match(content, /<Modal\b/);
  assert.match(content, /<SafeAreaView\b/);
  assert.ok(searchIndex !== -1 && mapIndex !== -1 && searchIndex < mapIndex,
    "search must remain top-anchored above the map viewport");
  assert.match(content, /onSubmitEditing=\{useTypedAddress\}/);
  assert.match(content, /const closePicker[\s\S]{0,180}Keyboard\.dismiss\(\)/);
  assert.match(content, /const confirm[\s\S]{0,180}Keyboard\.dismiss\(\)/);
  assert.match(content, /selectPrediction[\s\S]{0,800}Keyboard\.dismiss\(\)/);
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

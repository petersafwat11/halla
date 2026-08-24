const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const KEYBOARD_DIR = path.join(MOBILE_ROOT, "components", "commen", "keyboard");

const read = (name) =>
  fs.readFileSync(path.join(KEYBOARD_DIR, name), "utf8");

test("shared keyboard module exposes constants instead of page-local magic numbers", () => {
  const source = read("keyboardConstants.js");
  assert.match(source, /KEYBOARD_FIELD_CLEARANCE\s*=\s*16/, "default caret clearance is 16px (§5 rule 2)");
  assert.match(source, /KEYBOARD_DISMISS_MODE_IOS\s*=\s*"interactive"/);
  assert.match(source, /KEYBOARD_DISMISS_MODE_ANDROID\s*=\s*"on-drag"/);
  assert.match(source, /SHEET_MAX_HEIGHT_RATIO/);
});

test("KeyboardAwareFormScrollView owns the documented defaults and fallbacks (§6.2)", () => {
  const source = read("KeyboardAwareFormScrollView.js");

  // Native aware scroll view from the SDK-supported controller.
  assert.match(
    source,
    /import\s*{\s*KeyboardAwareScrollView\s*}\s*from\s*"react-native-keyboard-controller"/,
    "must use the keyboard-controller KeyboardAwareScrollView on iOS/Android"
  );

  // Default clearance comes from the shared constant, not a literal.
  assert.match(
    source,
    /bottomOffset\s*=\s*KEYBOARD_FIELD_CLEARANCE/,
    "bottomOffset must default to the shared 16px clearance"
  );

  // Tap + dismiss policy.
  assert.match(
    source,
    /keyboardShouldPersistTaps\s*=\s*"handled"/,
    "first-tap-while-keyboard-open must reach buttons/rows"
  );
  assert.match(
    source,
    /KEYBOARD_DISMISS_MODE_IOS/,
    "iOS dismisses interactively"
  );
  assert.match(
    source,
    /KEYBOARD_DISMISS_MODE_ANDROID/,
    "Android dismisses on drag"
  );
  assert.match(
    source,
    /showsVerticalScrollIndicator\s*=\s*false/,
    "indicator hidden unless caller overrides"
  );

  // Web falls back to an ordinary ScrollView; enabled=false escape hatch too.
  assert.match(source, /const IS_WEB = Platform\.OS === "web";/);
  assert.match(source, /enabled\s*=\s*true/);
  assert.match(
    source,
    /if \(IS_WEB \|\| !enabled\) \{[\s\S]{0,300}<ScrollView/,
    "web and enabled=false must render an ordinary ScrollView"
  );

  // API preservation: forwarded ref so refresh controls/scrollTo keep working.
  assert.match(source, /forwardRef/);

  // No hardcoded page padding in the adapter itself.
  assert.doesNotMatch(
    source,
    /paddingHorizontal:\s*\d+/,
    "adapter must not inject page padding"
  );
});

test("KeyboardAwareListScrollComponent is a renderScrollComponent adapter (§6.3)", () => {
  const source = read("KeyboardAwareListScrollComponent.js");

  assert.match(source, /forwardRef/, "FlatList needs a ref-forwarding scroll component");
  assert.match(
    source,
    /renderScrollComponent/i,
    "documented usage must be as renderScrollComponent of FlatList/SectionList"
  );
  assert.match(source, /bottomOffset\s*=\s*KEYBOARD_FIELD_CLEARANCE/);
  assert.match(source, /const IS_WEB = Platform\.OS === "web";/);
  assert.match(
    source,
    /if \(IS_WEB\) \{[\s\S]{0,300}<ScrollView/,
    "web must render an ordinary ScrollView"
  );
});

test("KeyboardSafeModalSheet implements the shared sheet contract (§6.4)", () => {
  const source = read("KeyboardSafeModalSheet.js");

  // Modal lifecycle + Android back handling.
  assert.match(source, /<Modal/);
  assert.match(source, /onRequestClose=\{handleRequestClose\}/);
  assert.match(
    source,
    /const requestClose[\s\S]*?Keyboard\.dismiss\(\)[\s\S]*?onClose\?\.\(\)/,
    "keyboard must be dismissed BEFORE completing the close transition (§10)"
  );

  // One displacement owner: keyboard-controller avoiding view; iOS pads while
  // Android relies on the explicit resize mode — never both at once.
  assert.match(
    source,
    /import\s*{\s*KeyboardAvoidingView\s*}\s*from\s*"react-native-keyboard-controller"/
  );
  assert.match(
    source,
    /behavior=\{IS_IOS \? "padding" : undefined\}/,
    "avoidance must be single-owner: iOS padding only; Android resize handles it"
  );

  // Backdrop is a sibling hit region of the sheet, not a parent Pressable.
  const backdropIdx = source.indexOf("styles.backdrop");
  const sheetIdx = source.indexOf("accessibilityViewIsModal");
  assert.ok(backdropIdx !== -1 && sheetIdx !== -1 && backdropIdx < sheetIdx,
    "backdrop must be declared as a sibling region before the sheet");
  assert.match(source, /accessible=\{false\}/);

  // Closed-state safe-area padding lives OUTSIDE the avoiding view so it is
  // not blindly summed with keyboard height (§7 Safe areas).
  const insetsIdx = source.indexOf("<KeyboardAvoidingView");
  const safeAreaIdx = source.indexOf("paddingBottom: insets.bottom");
  assert.ok(safeAreaIdx !== -1 && safeAreaIdx < insetsIdx,
    "sheet owns closed-state safe-area padding outside the avoiding view");

  // Live viewport measurement, never a stale captured window height.
  assert.match(source, /useWindowDimensions\(/);
  assert.match(
    source,
    /maxHeight:\s*maxSheetHeight/,
    "sheet max height derives from live window height × ratio"
  );
  assert.doesNotMatch(
    source,
    /Dimensions\.get\(/,
    "do not capture stale Dimensions for sheet sizing"
  );

  // Body slots: flexible body (minHeight 0 / flexShrink 1), fixed header and
  // footer slots, plus scroll-body vs virtualized-body options.
  assert.match(source, /minHeight:\s*0/);
  assert.match(source, /flexShrink:\s*1/);
  assert.match(source, /\{header\}/);
  assert.match(source, /\{footer\}/);
  assert.match(
    source,
    /scrollBody\s*=\s*true/,
    "scroll-body option via shared aware scroll view"
  );
  assert.match(
    source,
    /<KeyboardAwareFormScrollView/,
    "scroll bodies reuse the shared form scroll owner (never a second owner)"
  );
  assert.match(
    source,
    /\)\s*:\s*\(\s*children\s*\)/s,
    "virtualized bodies pass children through untouched to preserve FlatList virtualization"
  );

  // Focus handoff: onShow forwarded so callers focus after presentation (§10).
  assert.match(source, /onShow=\{onShow\}/);

  // Accessibility semantics.
  assert.match(source, /accessibilityViewIsModal/);
});

test("adapters do not nest keyboard-aware scroll owners inside each other (§11)", () => {
  const files = fs
    .readdirSync(KEYBOARD_DIR)
    .filter((f) => /\.js$/.test(f));

  for (const file of files) {
    const source = read(file);
    // Count owner IMPORTS only — a file that defines an adapter does not
    // "use" itself. Only vertical SCROLL owners count; the sheet's
    // displacement owner (KeyboardAvoidingView) composes with its optional
    // scroll body by design (§6.4).
    const scrollOwners = [
      /import\s+\w+\s+from\s+"[^"]*KeyboardAwareFormScrollView"/.test(source),
      /import\s+\w+\s+from\s+"[^"]*KeyboardAwareListScrollComponent"/.test(source),
      /import\s*{[^}]*KeyboardAwareScrollView[^}]*}\s*from\s*"react-native-keyboard-controller"/.test(
        source
      ),
    ].filter(Boolean).length;

    assert.ok(
      scrollOwners <= 1,
      `${file} composes multiple keyboard-aware scroll owners (${scrollOwners}); exactly one component may own focus scrolling per vertical region`
    );
  }
});

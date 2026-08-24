const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_ROOTS = ["components", "screens", "navigation"];

/**
 * Reviewed allowlist of files still using the RAW React Native
 * KeyboardAvoidingView while the §14 rollout is incomplete. Every entry needs
 * a migration target; new entries are not allowed — migrate to
 * KeyboardAwareFormScrollView / KeyboardSafeModalSheet instead.
 */
const RAW_AVOIDING_VIEW_ALLOWLIST = new Map([
  // Auth/profile screens: replace repeated KAV+ScrollView pairs with the one
  // shared form scroll owner (§8.2 Auth/profile row, P1).
  ["screens/auth/LoginScreen.js", "P1 auth → KeyboardAwareFormScrollView"],
  ["screens/auth/SignupScreen.js", "P1 auth → KeyboardAwareFormScrollView"],
  ["screens/auth/VendorSignupScreen.js", "P1 auth → KeyboardAwareFormScrollView"],
  ["screens/auth/ForgetPasswordScreen.js", "P1 auth → KeyboardAwareFormScrollView"],
  ["screens/auth/ResetPasswordScreen.js", "P1 auth → KeyboardAwareFormScrollView"],
  ["screens/auth/CompleteProfileScreen.js", "P1 auth → KeyboardAwareFormScrollView"],
  ["screens/host/ForcePasswordChangeScreen.js", "P1 auth → KeyboardAwareFormScrollView"],
  // Post-event local composition (§8.2 Post event row, P1).
  ["screens/host/PostEventScreen.js", "P1 post-event → aware-list/sticky composer"],
  // Staff portal page + QR card modal (§8.2 Guest portal row, P1).
  ["components/common/staff-portal/LoginView.js", "P1 staff portal → aware owner"],
  ["components/common/staff-portal/QRModal.js", "P1 QR card → KeyboardSafeModalSheet centered"],
  // Tickets modals already avoid, but via raw RN views (§8.2 Tickets row, P1).
  ["components/tickets/TicketModal.js", "P1 → KeyboardSafeModalSheet"],
  ["components/tickets/TicketRatingModal.js", "P1 → KeyboardSafeModalSheet"],
  // Admin creation/edit modals (§8.2 P2 rows).
  ["components/admin-dashboard/plans/EditPlanModal.js", "P2 → KeyboardSafeModalSheet"],
  ["components/admin-dashboard/discounts/DiscountFormModal.js", "P2 → KeyboardSafeModalSheet"],
  ["components/admin-dashboard/hosts/AddHostModal.js", "P2 → KeyboardSafeModalSheet"],
  // Step-three editor modal keeps a local pair until the canvas/preview state
  // gets its enabled=false escape hatch (§8.2 Create Step 3 row, P1).
  ["components/createEvent/StepThree.js", "P1 editor modal → shared aware owner"],
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

test("raw RN KeyboardAvoidingView only appears in reviewed allowlisted owners", () => {
  const violations = [];

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const rel = relFromRoot(file);
      if (rel.startsWith("components/commen/keyboard/")) continue;

      const content = fs.readFileSync(file, "utf8");
      const usesRawAvoidingView =
        /import\s*{[^}]*\bKeyboardAvoidingView\b[^}]*}\s*from\s*"react-native"/.test(
          content
        ) || /<KeyboardAvoidingView/.test(content);

      if (!usesRawAvoidingView) continue;
      if (RAW_AVOIDING_VIEW_ALLOWLIST.has(rel)) continue;
      violations.push(rel);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Raw KeyboardAvoidingView found outside the reviewed allowlist. Migrate these to ` +
      `KeyboardAwareFormScrollView / KeyboardSafeModalSheet (or add a documented reason):\n` +
      violations.join("\n")
  );
});

test("no per-page keyboard listeners or manual height math anywhere", () => {
  const violations = [];
  const pattern = /Keyboard\.addListener|keyboardHeight|keyboardDidShow|keyboardWillShow/;

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          violations.push(`${relFromRoot(file)}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Per-page keyboard listeners / height math are prohibited (blueprint §11). ` +
      `Use the shared owners instead:\n${violations.join("\n")}`
  );
});

test("input primitives stay free of keyboard-height and scroll calculations (§6.7)", () => {
  const PRIMITIVES = [
    "components/commen/TextInput.js",
    "components/commen/DirectionalTextInput.js",
    "components/commen/TextAreaInput.js",
    "components/commen/MobileInput.js",
    "components/commen/EmailInput.js",
    "components/commen/PasswordInput.js",
    "components/commen/OTPInput.js",
  ];
  const forbidden =
    /react-native-keyboard-controller|Keyboard\.addListener|scrollTo\(|keyboardHeight/;

  for (const rel of PRIMITIVES) {
    const full = path.join(MOBILE_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    assert.doesNotMatch(
      content,
      forbidden,
      `${rel} must only handle value/direction/validation/focus; keyboard geometry belongs to the shared owners`
    );
  }
});

test("no page-local keyboardVerticalOffset magic numbers outside the adapters", () => {
  const ALLOWED_PREFIXES = [
    "components/commen/keyboard/",
  ];

  const violations = [];
  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(MOBILE_ROOT, root))) {
      const rel = relFromRoot(file);
      if (ALLOWED_PREFIXES.some((p) => rel.startsWith(p))) continue;
      if (RAW_AVOIDING_VIEW_ALLOWLIST.has(rel)) continue; // pending migrations

      const content = fs.readFileSync(file, "utf8");
      if (/keyboardVerticalOffset/.test(content)) violations.push(rel);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `keyboardVerticalOffset values must come from derived layout/header APIs, never copied ` +
      `magic numbers (blueprint §7/§11):\n${violations.join("\n")}`
  );
});

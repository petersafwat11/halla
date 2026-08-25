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
const RAW_AVOIDING_VIEW_ALLOWLIST = new Map([]);

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

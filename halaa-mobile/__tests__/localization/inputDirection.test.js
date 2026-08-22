const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

const HOOK_PATH = path.resolve(__dirname, "..", "..", "hooks", "useInputDirection.js");

/**
 * The hook file imports the app's localization provider (React/RN), which is
 * not importable under plain Node. Strip that single import and load the pure
 * resolver from a temp copy so the contract stays node-testable.
 */
async function loadResolver() {
  const source = fs
    .readFileSync(HOOK_PATH, "utf8")
    .replace(/^import .*localization.*\r?\n/m, "");
  const tmp = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "halla-input-dir-")),
    "useInputDirection.testable.mjs"
  );
  fs.writeFileSync(tmp, source, "utf8");
  const mod = await import(pathToFileURL(tmp).href);
  return mod;
}

test("resolveInputDirection: localized follows the locale", async () => {
  const { resolveInputDirection } = await loadResolver();

  const rtl = resolveInputDirection("localized", { isRTL: true });
  assert.equal(rtl.writingDirection, "rtl");
  assert.equal(rtl.textAlign, "auto");

  const ltr = resolveInputDirection("localized", { isRTL: false });
  assert.equal(ltr.writingDirection, "ltr");
  assert.equal(ltr.textAlign, "auto");

  // default parameter behaves as localized
  assert.deepEqual(resolveInputDirection(undefined, { isRTL: true }), rtl);
});

test("resolveInputDirection: ltr stays LTR regardless of locale/value", async () => {
  const { resolveInputDirection } = await loadResolver();

  for (const isRTL of [true, false]) {
    for (const hasValue of [true, false]) {
      const r = resolveInputDirection("ltr", { isRTL, hasValue });
      assert.equal(r.writingDirection, "ltr");
    }
  }
});

test("resolveInputDirection: rtl stays RTL regardless of locale/value", async () => {
  const { resolveInputDirection } = await loadResolver();

  for (const isRTL of [true, false]) {
    for (const hasValue of [true, false]) {
      const r = resolveInputDirection("rtl", { isRTL, hasValue });
      assert.equal(r.writingDirection, "rtl");
    }
  }
});

test("resolveInputDirection: phone is localized when empty, LTR once filled", async () => {
  const { resolveInputDirection } = await loadResolver();

  // Arabic, empty → RTL placeholder (aligned right on iOS)
  assert.equal(
    resolveInputDirection("phone", { isRTL: true, hasValue: false }).writingDirection,
    "rtl"
  );
  // Arabic, typing → stable LTR digit/cursor order
  assert.equal(
    resolveInputDirection("phone", { isRTL: true, hasValue: true }).writingDirection,
    "ltr"
  );
  assert.equal(
    resolveInputDirection("phone", { isRTL: false, hasValue: true }).writingDirection,
    "ltr"
  );
});

test("resolveLabelDirection: localized follows locale alignment and writing direction", async () => {
  const { resolveLabelDirection } = await loadResolver();

  const rtl = resolveLabelDirection("localized", { isRTL: true });
  assert.equal(rtl.writingDirection, "rtl");
  assert.equal(rtl.textAlign, "right");

  const ltr = resolveLabelDirection("localized", { isRTL: false });
  assert.equal(ltr.writingDirection, "ltr");
  assert.equal(ltr.textAlign, "left");

  // strictly ltr label
  const strictlyLtr = resolveLabelDirection("ltr", { isRTL: true });
  assert.equal(strictlyLtr.writingDirection, "ltr");
  assert.equal(strictlyLtr.textAlign, "left");
});

test("resolveFieldDirection keeps every field role in one logical contract", async () => {
  const { resolveFieldDirection } = await loadResolver();

  const rtl = resolveFieldDirection("phone", { isRTL: true, hasValue: true });
  assert.equal(rtl.input.writingDirection, "ltr");
  assert.equal(rtl.text.writingDirection, "rtl");
  assert.equal(rtl.text.textAlign, "right");
  assert.equal(rtl.counter.writingDirection, "ltr");
  assert.equal(rtl.counter.textAlign, "left");

  const ltr = resolveFieldDirection("localized", { isRTL: false });
  assert.equal(ltr.input.writingDirection, "ltr");
  assert.equal(ltr.text.textAlign, "left");
  assert.equal(ltr.counter.textAlign, "right");
});

test("RTL-01 & RTL-02: TextInput, DropdownInput, and TicketModal use direction contracts", () => {
  const textInputSource = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "components", "commen", "TextInput.js"),
    "utf8"
  );
  const dropdownSource = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "components", "commen", "DropdownInput.js"),
    "utf8"
  );
  const ticketModalSource = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "components", "tickets", "TicketModal.js"),
    "utf8"
  );

  assert.ok(textInputSource.includes("useFieldDirection"), "TextInput must use the full field contract");
  assert.ok(
    dropdownSource.includes("useFieldDirection"),
    "DropdownInput must use the full field contract"
  );
  assert.ok(
    ticketModalSource.includes("DirectionalTextInput") && ticketModalSource.includes("useFieldDirection"),
    "TicketModal must use the direction-aware primitive and field contract"
  );
  assert.ok(
    textInputSource.includes("fieldDirection.input") && textInputSource.includes("fieldDirection.text"),
    "TextInput must apply the contract to both input and metadata"
  );
});

test("all direct native TextInput usage is confined to shared low-level primitives", () => {
  const roots = ["components", "screens"];
  const allowed = new Set([
    "components/commen/DirectionalTextInput.js",
    "components/commen/MobileInput.js",
    "components/commen/OTPInput.js",
    "components/commen/PasswordInput.js",
    "components/commen/TextAreaInput.js",
    "components/commen/TextInput.js",
  ]);
  const violations = [];

  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [full] : [];
    });

  for (const root of roots) {
    for (const file of walk(path.resolve(__dirname, "..", "..", root))) {
      const rel = path.relative(path.resolve(__dirname, "..", ".."), file).replace(/\\/g, "/");
      if (allowed.has(rel)) continue;
      const source = fs.readFileSync(file, "utf8");
      if (
        /import\s*\{[\s\S]{0,600}?\bTextInput(?:\s+as\s+\w+)?\b[\s\S]{0,600}?\}\s*from\s*["']react-native["']/.test(source) ||
        /require\(["']react-native["']\)[\s\S]{0,100}?TextInput/.test(source)
      ) {
        violations.push(rel);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Direct native TextInput bypasses the RTL field contract: ${violations.join(", ")}`
  );
});

test("Step 1 uses dedicated event-name validation copy", () => {
  const stepOne = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "components", "createEvent", "StepOne.js"),
    "utf8"
  );
  const ar = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "..", "..", "localization", "locales", "ar", "createEvent.json"), "utf8")
  );
  const en = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "..", "..", "localization", "locales", "en", "createEvent.json"), "utf8")
  );

  assert.match(stepOne, /required:\s*t\("event_name_required"\)/);
  assert.equal(ar.event_name_required, "اسم المناسبة مطلوب");
  assert.equal(en.event_name_required, "Event name is required");
});

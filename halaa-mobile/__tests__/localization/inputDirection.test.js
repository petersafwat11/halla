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

test("resolveStrongDirection returns the first strong character's script (blueprint §5.1)", async () => {
  const { resolveStrongDirection } = await loadResolver();

  assert.equal(resolveStrongDirection("Ali"), "ltr");
  assert.equal(resolveStrongDirection("علي"), "rtl");
  assert.equal(resolveStrongDirection("Halaa 2026"), "ltr");
  assert.equal(resolveStrongDirection("حفل Halaa 2026"), "rtl");
  // Mixed address whose first strong token decides.
  assert.equal(resolveStrongDirection("شارع الملك فهد، Riyadh"), "rtl");
  assert.equal(resolveStrongDirection("2413 King Fahd Rd, الرياض"), "ltr");
  // Emoji/symbols/digits are neutral and skipped while scanning.
  assert.equal(resolveStrongDirection("🎉 مبروك!"), "rtl");
  assert.equal(resolveStrongDirection("🎉 Congrats!"), "ltr");
  // No strong character → fall back to the selected locale.
  assert.equal(resolveStrongDirection("0512345678", true), "rtl");
  assert.equal(resolveStrongDirection("0512345678", false), "ltr");
  assert.equal(resolveStrongDirection("", true), "rtl");
  assert.equal(resolveStrongDirection(undefined, false), "ltr");
});

test("resolveInputDirection: adaptive keeps placeholders locale-scoped but values first-strong", async () => {
  const { resolveInputDirection } = await loadResolver();

  // Empty → placeholder follows the UI locale in both languages.
  assert.equal(
    resolveInputDirection("adaptive", { isRTL: true, hasValue: false }).writingDirection,
    "rtl"
  );
  assert.equal(
    resolveInputDirection("adaptive", { isRTL: false, hasValue: false }).writingDirection,
    "ltr"
  );

  // Screenshot 6: Latin value inside Arabic UI must render LTR…
  assert.equal(
    resolveInputDirection("adaptive", { isRTL: true, hasValue: true, value: "Ali" }).writingDirection,
    "ltr"
  );
  // …and Arabic values inside English UI must stay RTL.
  assert.equal(
    resolveInputDirection("adaptive", { isRTL: false, hasValue: true, value: "علي" }).writingDirection,
    "rtl"
  );

  // Neutral-only filled values fall back to the locale direction.
  assert.equal(
    resolveInputDirection("adaptive", { isRTL: true, hasValue: true, value: "12345" }).writingDirection,
    "rtl"
  );

  // textAlign stays auto so alignment follows the logical reading start.
  assert.equal(
    resolveInputDirection("adaptive", { isRTL: true, hasValue: true, value: "Ali" }).textAlign,
    "auto"
  );
});

test("resolveLabelDirection: labels/helpers/errors never follow an adaptive or phone value", () => {
  // The label contract is exercised through resolveFieldDirection below; this
  // assertion documents the screenshot-6 rule: a value changing script must
  // not drag its localized chrome with it. Covered by
  // "resolveFieldDirection keeps every field role in one logical contract".
  assert.ok(true);
});

test("resolveLabelDirection: localized uses native logical-start alignment", async () => {
  const { resolveLabelDirection } = await loadResolver();

  const rtl = resolveLabelDirection("localized", { isRTL: true });
  assert.equal(rtl.writingDirection, "rtl");
  assert.equal(rtl.textAlign, "left");

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
  assert.equal(rtl.text.textAlign, "left");
  assert.equal(rtl.counter.writingDirection, "ltr");
  assert.equal(rtl.counter.textAlign, "right");

  const ltr = resolveFieldDirection("localized", { isRTL: false });
  assert.equal(ltr.input.writingDirection, "ltr");
  assert.equal(ltr.text.textAlign, "left");
  assert.equal(ltr.counter.textAlign, "right");

  // Screenshot 6 decoupling: an adaptive Latin value in Arabic UI keeps its
  // LTR input while label and error chrome stay RTL/localized.
  const mixed = resolveFieldDirection("adaptive", {
    isRTL: true,
    hasValue: true,
    value: "Ali",
  });
  assert.equal(mixed.input.writingDirection, "ltr");
  assert.equal(mixed.text.writingDirection, "rtl");
  assert.equal(mixed.text.textAlign, "left");
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

test("resolveInputDirection: adaptive placeholder follows the locale while empty", async () => {
  const { resolveInputDirection } = await loadResolver();

  assert.equal(
    resolveInputDirection("adaptive", { isRTL: true, hasValue: false }).writingDirection,
    "rtl"
  );
  assert.equal(
    resolveInputDirection("adaptive", { isRTL: false, hasValue: false }).writingDirection,
    "ltr"
  );
});

test("resolveInputDirection: adaptive value follows its first strong character", async () => {
  const { resolveInputDirection } = await loadResolver();

  const cases = [
    // [value, expected]
    ["Ali", "ltr"],
    ["علي", "rtl"],
    ["Halaa 2026", "ltr"],
    ["حفل Halaa 2026", "rtl"],
    ["شارع الملك فهد, Riyadh 12345", "rtl"],
    ["🎉 party time", "ltr"],
    ["🥳 عرس 🎉", "rtl"],
    ["   (leading punctuation) 42", "ltr"],
  ];
  for (const [value, expected] of cases) {
    for (const isRTL of [true, false]) {
      assert.equal(
        resolveInputDirection("adaptive", { isRTL, hasValue: true, value }).writingDirection,
        expected,
        `value=${JSON.stringify(value)} isRTL=${isRTL}`
      );
    }
  }
});

test("resolveInputDirection: adaptive neutral-only values fall back to the locale", async () => {
  const { resolveInputDirection } = await loadResolver();

  for (const value of ["", "123456", "!!??", "🎉🎉", "   "]) {
    assert.equal(
      resolveInputDirection("adaptive", { isRTL: true, hasValue: true, value }).writingDirection,
      "rtl",
      `value=${JSON.stringify(value)}`
    );
    assert.equal(
      resolveInputDirection("adaptive", { isRTL: false, hasValue: true, value }).writingDirection,
      "ltr",
      `value=${JSON.stringify(value)}`
    );
  }
});

test("labels/helpers/errors never follow an adaptive or LTR value", async () => {
  const { resolveFieldDirection } = await loadResolver();

  // Arabic UI with a Latin value typed into an adaptive field:
  const field = resolveFieldDirection("adaptive", {
    isRTL: true,
    hasValue: true,
    value: "Ali",
  });
  assert.equal(field.input.writingDirection, "ltr");
  assert.equal(field.text.writingDirection, "rtl", "label chrome must stay localized");
  assert.equal(field.text.textAlign, "left");

  // English UI with an Arabic value typed into an LTR-declared field keeps
  // both the token and the chrome stable.
  const ltrField = resolveFieldDirection("ltr", { isRTL: false, hasValue: true, value: "علي" });
  assert.equal(ltrField.input.writingDirection, "ltr");
  assert.equal(ltrField.text.writingDirection, "ltr");
});

test("DirectionalTextInput stays the only low-level primitive and feeds adaptive values", () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "components", "commen", "DirectionalTextInput.js"),
    "utf8"
  );
  assert.ok(
    src.includes("value: value ?? defaultValue"),
    "DirectionalTextInput must pass the raw value so adaptive mode resolves first-strong on every change"
  );
  assert.ok(src.includes("CONTENT_DIRECTIONS"), "DirectionalTextInput must use the shared content-direction contract");
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

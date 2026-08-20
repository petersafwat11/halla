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
  // English → always LTR
  assert.equal(
    resolveInputDirection("phone", { isRTL: false, hasValue: false }).writingDirection,
    "ltr"
  );
  assert.equal(
    resolveInputDirection("phone", { isRTL: false, hasValue: true }).writingDirection,
    "ltr"
  );
});

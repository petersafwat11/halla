const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

const HOOK_PATH = path.resolve(__dirname, "..", "..", "hooks", "useInputDirection.js");

/**
 * The hook imports the app's localization provider (React/RN), which is not
 * importable under plain Node. Strip that single import and load the pure
 * resolvers from a temp copy — same technique as inputDirection.test.js.
 */
async function loadResolver() {
  const source = fs
    .readFileSync(HOOK_PATH, "utf8")
    .replace(/^import .*localization.*\r?\n/m, "");
  const tmp = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "halla-adaptive-dir-")),
    "useInputDirection.adaptive.mjs"
  );
  fs.writeFileSync(tmp, source, "utf8");
  const mod = await import(pathToFileURL(tmp).href);
  return mod;
}

test("resolveStrongDirection: Latin first-strong values resolve LTR in any UI locale", async () => {
  const { resolveStrongDirection } = await loadResolver();

  for (const isRTL of [true, false]) {
    assert.equal(resolveStrongDirection("Ali", isRTL), "ltr");
    assert.equal(resolveStrongDirection("Halaa 2026", isRTL), "ltr");
    assert.equal(resolveStrongDirection("123 King Fahd Rd, Riyadh", isRTL), "ltr");
    // Emoji and symbols are neutral; the first strong char decides.
    assert.equal(resolveStrongDirection("🎉 Party time!", isRTL), "ltr");
  }
});

test("resolveStrongDirection: Arabic first-strong values resolve RTL in any UI locale", async () => {
  const { resolveStrongDirection } = await loadResolver();

  for (const isRTL of [true, false]) {
    assert.equal(resolveStrongDirection("علي", isRTL), "rtl");
    // Mixed content follows its FIRST strong character.
    assert.equal(resolveStrongDirection("حفل Halaa 2026", isRTL), "rtl");
    assert.equal(resolveStrongDirection("شارع الملك فهد، الرياض 12345", isRTL), "rtl");
  }
});

test("resolveStrongDirection: neutral-only values fall back to the selected locale", async () => {
  const { resolveStrongDirection } = await loadResolver();

  assert.equal(resolveStrongDirection("", true), "rtl");
  assert.equal(resolveStrongDirection("", false), "ltr");
  assert.equal(resolveStrongDirection(null, true), "rtl");
  assert.equal(resolveStrongDirection(undefined, false), "ltr");
  // Digits-only, punctuation-only and emoji-only carry no strong character.
  for (const neutral of ["12345", "+966-5-", "!!!", "🙂🙂"]) {
    assert.equal(resolveStrongDirection(neutral, true), "rtl", `"${neutral}" should fall back to rtl`);
    assert.equal(resolveStrongDirection(neutral, false), "ltr", `"${neutral}" should fall back to ltr`);
  }
});

test("adaptive input mode: empty placeholder follows the locale, filled value follows first strong character", async () => {
  const { resolveInputDirection, CONTENT_DIRECTIONS } = await loadResolver();
  const ADAPTIVE = CONTENT_DIRECTIONS.ADAPTIVE;

  // Empty field under Arabic UI → RTL placeholder.
  assert.equal(resolveInputDirection(ADAPTIVE, { isRTL: true }).writingDirection, "rtl");
  // Empty field under English UI → LTR placeholder.
  assert.equal(resolveInputDirection(ADAPTIVE, { isRTL: false }).writingDirection, "ltr");

  // Screenshot-6 regression ("Ali" forced to the Arabic edge): a Latin value
  // inside an Arabic UI must become LTR.
  assert.equal(
    resolveInputDirection(ADAPTIVE, { isRTL: true, hasValue: true, value: "Ali" }).writingDirection,
    "ltr"
  );
  // An Arabic value inside an English UI must become RTL.
  assert.equal(
    resolveInputDirection(ADAPTIVE, { isRTL: false, hasValue: true, value: "علي" }).writingDirection,
    "rtl"
  );

  // Alignment stays logical-start/auto in every resolved state.
  const states = [
    { isRTL: true },
    { isRTL: false },
    { isRTL: true, hasValue: true, value: "Ali" },
    { isRTL: true, hasValue: true, value: "شكوى #123" },
    { isRTL: false, hasValue: true, value: "شكوى #123" },
  ];
  for (const state of states) {
    assert.equal(resolveInputDirection(ADAPTIVE, state).textAlign, "auto");
  }
});

test("field contract decoupling: adaptive values never drag labels/helpers/errors with them", async () => {
  const { resolveFieldDirection, CONTENT_DIRECTIONS } = await loadResolver();

  // Latin value inside Arabic UI: value LTR, chrome stays Arabic/locale.
  const latinInArabic = resolveFieldDirection(CONTENT_DIRECTIONS.ADAPTIVE, {
    isRTL: true,
    hasValue: true,
    value: "Ali",
  });
  assert.equal(latinInArabic.input.writingDirection, "ltr");
  assert.equal(latinInArabic.text.writingDirection, "rtl");
  assert.equal(latinInArabic.text.textAlign, "left"); // native logical start

  // Arabic value inside English UI: value RTL, chrome stays English/locale.
  const arabicInEnglish = resolveFieldDirection(CONTENT_DIRECTIONS.ADAPTIVE, {
    isRTL: false,
    hasValue: true,
    value: "علي",
  });
  assert.equal(arabicInEnglish.input.writingDirection, "rtl");
  assert.equal(arabicInEnglish.text.writingDirection, "ltr");
  assert.equal(arabicInEnglish.counter.writingDirection, "ltr");
});

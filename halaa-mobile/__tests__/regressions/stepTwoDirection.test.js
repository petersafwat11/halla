import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

const read = (rel) => fs.readFileSync(path.join(mobileRoot, rel), "utf8");

const ARABIC_LITERAL = /[\u0600-\u06FF]/;

test("STEP2-DIR-01: GuestForm and ModeratorForm render through the shared field shell with explicit content modes", () => {
  for (const rel of [
    "components/createEvent/_components/GuestForm.js",
    "components/createEvent/_components/ModeratorForm.js",
  ]) {
    const source = read(rel);

    assert.ok(
      source.includes("FormField"),
      `${rel} must render fields through the shared FormField shell`
    );
    assert.ok(
      source.includes('contentDirection="adaptive"'),
      `${rel} must declare the name field as adaptive user text`
    );
    assert.ok(
      source.includes('contentDirection="phone"'),
      `${rel} must declare the phone field with the phone mode`
    );
    assert.ok(
      !source.includes("styles.inputLabel") && !source.includes("styles.errorText"),
      `${rel} must not recreate local label/error chrome that can omit direction`
    );
    assert.ok(
      !ARABIC_LITERAL.test(source),
      `${rel} must not contain direct Arabic UI literals`
    );
  }
});

test("STEP2-DIR-02: phone digits stay LTR and placeholders stay localized", async () => {
  const source = fs
    .readFileSync(path.join(mobileRoot, "hooks", "useInputDirection.js"), "utf8")
    .replace(/^import .*localization.*\r?\n/m, "");
  const tmp = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "halla-step2-")),
    "useInputDirection.step2.mjs"
  );
  fs.writeFileSync(tmp, source, "utf8");
  const { resolveInputDirection } = await import(pathToFileURL(tmp).href);

  assert.equal(
    resolveInputDirection("phone", { isRTL: true, hasValue: true, value: "0512345678" })
      .writingDirection,
    "ltr"
  );
  assert.equal(
    resolveInputDirection("phone", { isRTL: true, hasValue: false }).writingDirection,
    "rtl",
    "empty phone placeholder follows the Arabic UI locale"
  );
});

test("STEP2-DIR-03: CategorySelect has localized defaults, adaptive value, and a trailing chevron", () => {
  const source = read("components/commen/CategorySelect.js");

  assert.ok(
    !ARABIC_LITERAL.test(source),
    "CategorySelect must resolve its placeholder/metadata from i18n, not hardcoded Arabic defaults"
  );
  assert.ok(
    source.includes('t("category_placeholder")'),
    "CategorySelect must use the localized category_placeholder key by default"
  );
  assert.ok(
    source.includes('contentDirection="adaptive"'),
    "CategorySelect trigger value must render adaptively (user-created categories)"
  );
  assert.ok(
    source.includes("trailing=") && source.includes("chevron-down"),
    "CategorySelect dropdown affordance must occupy the logical trailing slot"
  );
  assert.ok(
    !source.includes("row-reverse"),
    "CategorySelect must not double-flip the native RTL layout"
  );
});

test("STEP2-DIR-04: CategoryPickerSheet metadata is localized and option rows are adaptive", () => {
  const source = read("components/commen/CategoryPickerSheet.js");

  assert.ok(
    !ARABIC_LITERAL.test(source),
    "CategoryPickerSheet must not hardcode Arabic defaults; all copy comes from i18n keys"
  );
  assert.ok(
    source.includes("LocalizedText"),
    "Sheet title / none-row are app copy and must use the localized primitive"
  );
  assert.ok(
    source.includes("AdaptiveText"),
    "User-created category options must use the adaptive primitive"
  );
  assert.ok(
    source.includes('contentDirection="adaptive"'),
    "The sheet search input must accept Latin or Arabic queries adaptively"
  );

  const ar = JSON.parse(
    fs.readFileSync(
      path.join(mobileRoot, "localization", "locales", "ar", "createEvent.json"),
      "utf8"
    )
  );
  const en = JSON.parse(
    fs.readFileSync(
      path.join(mobileRoot, "localization", "locales", "en", "createEvent.json"),
      "utf8"
    )
  );

  for (const key of [
    "category_search_placeholder",
    "category_none_label",
    "category_create_label",
    "moderator_name_placeholder",
  ]) {
    assert.ok(ar[key] && en[key], `createEvent key "${key}" must exist in both locales`);
  }
  assert.match(ar.category_create_label, /\{\{query\}\}/);
  assert.match(en.category_create_label, /\{\{query\}\}/);
});

test("STEP2-DIR-05: EditGuestOrModeratorsModal uses the shared shell and localized chrome", () => {
  const source = read("components/createEvent/EditGuestOrModeratorsModal.js");

  assert.ok(source.includes("FormField"), "Modal fields must use the shared FormField shell");
  assert.ok(
    source.includes('contentDirection="adaptive"'),
    "Name field must be adaptive in the edit modal too"
  );
  assert.ok(
    source.includes('contentDirection="phone"'),
    "Phone field must keep stable LTR digits in the edit modal"
  );
  assert.ok(
    source.includes("LocalizedText"),
    "Header title and cancel action must use the localized text contract"
  );
  assert.ok(
    !source.includes("styles.inputLabel") && !source.includes("styles.errorText"),
    "Modal must not carry its duplicated local label/error styles anymore"
  );
});

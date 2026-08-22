import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("SHEET-01: ListOfGuestsORModerators applies useSafeAreaInsets and replaces hardcoded text with t()", () => {
  const file = path.join(mobileRoot, "components/createEvent/ListOfGuestsORModerators.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes("useSafeAreaInsets"), "ListOfGuestsORModerators must import/use useSafeAreaInsets");
  assert.ok(content.includes("insets?.bottom"), "ListOfGuestsORModerators must use insets.bottom on modalContainer");
  assert.ok(content.includes('t("total_label"'), "ListOfGuestsORModerators must use t('total_label')");
  assert.ok(content.includes('t("no_guests_yet"'), "ListOfGuestsORModerators must use t('no_guests_yet')");
  assert.ok(!content.includes('إجمالي: {list.length}'), "ListOfGuestsORModerators must not contain raw hardcoded header text");
});

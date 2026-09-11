import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arabicNumerals = /[٠-٩۰-۹]/;

test("mobile locale copy contains Latin digits only", () => {
  const localeRoot = path.join(root, "localization", "locales");
  for (const language of fs.readdirSync(localeRoot)) {
    for (const name of fs.readdirSync(path.join(localeRoot, language))) {
      if (!name.endsWith(".json")) continue;
      const source = fs.readFileSync(path.join(localeRoot, language, name), "utf8");
      assert.doesNotMatch(source, arabicNumerals, `${language}/${name}`);
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const arDir = path.resolve(__dirname, "../../localization/locales/ar");
const enDir = path.resolve(__dirname, "../../localization/locales/en");

function getLeafKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(getLeafKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Strip i18next v4 plural suffixes (_zero, _one, _two, _few, _many, _other) to compare root keys
function stripPluralSuffix(key) {
  return key.replace(/_(zero|one|two|few|many|other)$/, "");
}

test("Translation files exist in both Arabic and English locales", () => {
  const arFiles = fs.readdirSync(arDir).filter((f) => f.endsWith(".json"));
  const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith(".json"));

  assert.deepEqual(
    arFiles.sort(),
    enFiles.sort(),
    "Arabic and English locale directories should have identical JSON files"
  );
});

test("Key parity between Arabic and English translation namespaces", () => {
  const arFiles = fs.readdirSync(arDir).filter((f) => f.endsWith(".json"));

  for (const file of arFiles) {
    const arContent = JSON.parse(fs.readFileSync(path.join(arDir, file), "utf8"));
    const enContent = JSON.parse(fs.readFileSync(path.join(enDir, file), "utf8"));

    const arKeys = new Set(getLeafKeys(arContent).map(stripPluralSuffix));
    const enKeys = new Set(getLeafKeys(enContent).map(stripPluralSuffix));

    assert.ok(arKeys.size > 0, `${file} in Arabic has keys`);
    assert.ok(enKeys.size > 0, `${file} in English has keys`);

    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));

    assert.deepEqual(
      missingInEn,
      [],
      `${file}: keys missing in English locale: ${missingInEn.join(", ")}`
    );
    assert.deepEqual(
      missingInAr,
      [],
      `${file}: keys missing in Arabic locale: ${missingInAr.join(", ")}`
    );
  }
});

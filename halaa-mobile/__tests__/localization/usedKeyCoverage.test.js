import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");
const localesDir = path.join(mobileRoot, "localization", "locales");

// Load all AR and EN bundles
function loadLocales(lang) {
  const dir = path.join(localesDir, lang);
  const bundles = {};
  if (!fs.existsSync(dir)) return bundles;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".json")) {
      const ns = path.basename(file, ".json");
      bundles[ns] = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    }
  }
  return bundles;
}

const arLocales = loadLocales("ar");
const enLocales = loadLocales("en");

function getNestedValue(obj, keyPath) {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = keyPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function resolveKeyInBundles(bundles, primaryNs, key) {
  // 1. If key is explicit ns:key
  if (key.includes(":")) {
    const [ns, rest] = key.split(":");
    if (bundles[ns]) {
      const val = getNestedValue(bundles[ns], rest);
      if (val !== undefined) return val;
    }
  }

  // 2. Primary namespace check
  if (bundles[primaryNs]) {
    const val = getNestedValue(bundles[primaryNs], key);
    if (val !== undefined) return val;
  }

  // 3. Namespace by first key token (e.g. "auth.foo", "plans.bar", "events.baz")
  const firstDot = key.indexOf(".");
  if (firstDot !== -1) {
    const candidateNs = key.slice(0, firstDot);
    const subKey = key.slice(firstDot + 1);
    if (bundles[candidateNs]) {
      const val = getNestedValue(bundles[candidateNs], subKey);
      if (val !== undefined) return val;
    }
  }

  // 4. Common namespace fallback
  if (bundles.common) {
    const val = getNestedValue(bundles.common, key);
    if (val !== undefined) return val;
  }

  // 5. Check all namespaces for direct match
  for (const ns of Object.keys(bundles)) {
    const val = getNestedValue(bundles[ns], key);
    if (val !== undefined) return val;
  }

  return undefined;
}

// Known dynamic patterns and prefixes
const DYNAMIC_ALLOWLIST = new Set([
  "status.",
  "types.",
  "planFamilies.",
  "taglines.",
  "billingTypes.",
  "eventTypes.",
  "roles.",
  "actions.",
  "categories.",
  "categoryNames.",
  "errors.",
  "addons.designTypes.",
  "authErrors.",
  "pricing.",
  "validation.",
  "duration.",
  "events.hostSelector.tabs.",
  "tabs.",
]);

function isDynamicAllowed(key) {
  for (const prefix of DYNAMIC_ALLOWLIST) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

function collectSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "__tests__") {
        collectSourceFiles(fullPath, fileList);
      }
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

test("DAT-01 & DAT-03: Used translation keys in halaa-mobile source exist in both AR and EN locale bundles", () => {
  const sourceDirs = [
    path.join(mobileRoot, "components"),
    path.join(mobileRoot, "screens"),
    path.join(mobileRoot, "hooks"),
    path.join(mobileRoot, "navigation"),
  ];

  const files = sourceDirs.flatMap((d) => collectSourceFiles(d));
  assert.ok(files.length > 30, `Expected > 30 source files, found ${files.length}`);

  const missingInAr = [];
  const missingInEn = [];

  const tRegex = /\bt\(\s*["']([a-zA-Z0-9_.-]+)["']/g;
  const nsRegex = /useTranslation\(\s*["']([a-zA-Z0-9_.-]+)["']\s*\)/;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const nsMatch = content.match(nsRegex);
    const namespace = nsMatch ? nsMatch[1] : "common";

    let match;
    while ((match = tRegex.exec(content)) !== null) {
      const key = match[1];
      if (isDynamicAllowed(key)) continue;

      const valAr = resolveKeyInBundles(arLocales, namespace, key);
      const valEn = resolveKeyInBundles(enLocales, namespace, key);

      const relPath = path.relative(mobileRoot, file);
      if (valAr === undefined) {
        missingInAr.push(`${relPath} -> ns:${namespace} key:"${key}"`);
      }
      if (valEn === undefined) {
        missingInEn.push(`${relPath} -> ns:${namespace} key:"${key}"`);
      }
    }
  }

  // Deduplicate errors
  const uniqueArMissing = [...new Set(missingInAr)];
  const uniqueEnMissing = [...new Set(missingInEn)];

  assert.deepEqual(
    uniqueArMissing,
    [],
    `Found keys used in mobile source missing from AR locales:\n${uniqueArMissing.join("\n")}`
  );
  assert.deepEqual(
    uniqueEnMissing,
    [],
    `Found keys used in mobile source missing from EN locales:\n${uniqueEnMissing.join("\n")}`
  );
});

test("DAT-02: CurrentPlanCard maps daysRemaining -1 / null sentinel to noExpiry", () => {
  const currentPlanSource = fs.readFileSync(
    path.join(mobileRoot, "components/plans/CurrentPlanCard.js"),
    "utf8"
  );

  assert.ok(
    currentPlanSource.includes("subscription.daysRemaining === -1"),
    "CurrentPlanCard must explicitly check for -1 sentinel"
  );
  assert.ok(
    currentPlanSource.includes('t("currentPlan.noExpiry")'),
    "CurrentPlanCard must use localized noExpiry string"
  );
  assert.equal(arLocales.plans?.currentPlan?.noExpiry, "لا تنتهي");
  assert.equal(enLocales.plans?.currentPlan?.noExpiry, "No expiry");
});

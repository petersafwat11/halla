import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatLocation,
  formatGuestCount,
  getLocalized,
  normalizeDigits,
} from "../src/utils/locale.js";
import { formatSar, buildCheckoutQuote } from "../src/utils/money.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

function getKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(getKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function verifyNamespaceParity(localesDir) {
  const arDir = path.join(localesDir, "ar");
  const enDir = path.join(localesDir, "en");
  assert.ok(fs.existsSync(arDir), `ar directory exists at ${arDir}`);
  assert.ok(fs.existsSync(enDir), `en directory exists at ${enDir}`);

  const arFiles = fs.readdirSync(arDir).filter((f) => f.endsWith(".json"));
  const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith(".json"));

  assert.deepEqual(
    arFiles.sort(),
    enFiles.sort(),
    `File names match between ar and en in ${localesDir}`
  );

  const missingReport = [];
  for (const file of arFiles) {
    const arObj = JSON.parse(fs.readFileSync(path.join(arDir, file), "utf8"));
    const enObj = JSON.parse(fs.readFileSync(path.join(enDir, file), "utf8"));

    const arKeys = new Set(getKeys(arObj));
    const enKeys = new Set(getKeys(enObj));

    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));

    if (missingInEn.length > 0) {
      missingReport.push(`${file} missing in EN: ${missingInEn.join(", ")}`);
    }
    if (missingInAr.length > 0) {
      missingReport.push(`${file} missing in AR: ${missingInAr.join(", ")}`);
    }
  }

  assert.equal(
    missingReport.length,
    0,
    `Discrepancies found in ${localesDir}:\n${missingReport.join("\n")}`
  );
}

describe("Session 6.2: Localization & Accessibility Parity Suite", () => {
  it("halaa-web locale bundles have 100% key parity between AR and EN across all namespaces", () => {
    const webLocalesDir = path.join(ROOT, "halaa-web", "localization", "locales");
    verifyNamespaceParity(webLocalesDir);
  });

  it("halaa-mobile locale bundles have 100% key parity between AR and EN across all namespaces", () => {
    const mobileLocalesDir = path.join(ROOT, "halaa-mobile", "localization", "locales");
    verifyNamespaceParity(mobileLocalesDir);
  });

  it("formatDate handles both ar and en with fallback safety", () => {
    const d = new Date("2026-08-22T10:00:00Z");
    const enDate = formatDate(d, "en");
    const arDate = formatDate(d, "ar");

    assert.ok(enDate.includes("2026") || enDate.includes("Aug"), "enDate formatted");
    assert.ok(arDate.length > 0, "arDate formatted");
    assert.equal(formatDate(null), "");
    assert.equal(formatDate("not-a-date"), "");
  });

  it("formatTime handles dates, timestamps, and 12/24 hour strings in both locales", () => {
    assert.equal(formatTime("14:30", "en"), "2:30 PM");
    assert.equal(formatTime("14:30", "ar"), "٢:٣٠ م");
    assert.equal(formatTime("09:15 AM", "en"), "9:15 AM");
    assert.equal(formatTime("09:15 AM", "ar"), "٩:١٥ ص");
    assert.equal(formatTime(null), "");
  });

  it("formatDateTime formats localized date and time", () => {
    const d = new Date("2026-08-22T14:30:00Z");
    const enDt = formatDateTime(d, "en");
    const arDt = formatDateTime(d, "ar");
    assert.ok(enDt.length > 0);
    assert.ok(arDt.length > 0);
    assert.equal(formatDateTime(null), "");
  });

  it("formatLocation de-duplicates and localizes address tokens", () => {
    const loc = formatLocation({ name: "Hall", address: "Main St, Hall", city: "Riyadh" }, "en");
    assert.equal(loc, "Hall, Main St, Riyadh");
  });

  it("formatNumber, formatPercent, formatGuestCount handle Arabic and English plurals and numerals", () => {
    assert.equal(formatNumber(1250, "en"), "1,250");
    assert.equal(formatPercent(25, "en"), "25%");
    assert.equal(formatPercent(25, "ar"), "٢٥٪");

    assert.equal(formatGuestCount(0, "ar"), "لا يوجد ضيوف");
    assert.equal(formatGuestCount(1, "ar"), "ضيف واحد");
    assert.equal(formatGuestCount(2, "ar"), "ضيفان");
    assert.equal(formatGuestCount(5, "ar"), "٥ ضيوف");
    assert.equal(formatGuestCount(50, "ar"), "٥٠ ضيفاً");
    assert.equal(formatGuestCount(150, "ar"), "١٥٠ ضيف");
  });

  it("formatSar and buildCheckoutQuote preserve exact currency format without floating drift", () => {
    assert.equal(formatSar(199), "199.00");
    assert.equal(formatSar(199.5), "199.50");
    assert.equal(formatSar(199, { includeCurrency: true }), "199.00 SAR");
    assert.equal(formatSar(199, { includeCurrency: true, currency: "ر.س" }), "199.00 ر.س");

    const quote = buildCheckoutQuote({
      plan: { code: "monthly_pro", price: 299 },
      discountAmount: 29.9,
      addons: [],
    });
    assert.equal(quote.subtotal, 299);
    assert.equal(quote.discountAmount, 29.9);
    assert.equal(quote.total, 269.1);
  });

  it("getLocalized selects correct language suffix with fallback", () => {
    const item = { nameAr: "باقة متميزة", nameEn: "Premium Package" };
    assert.equal(getLocalized(item, "name", "ar"), "باقة متميزة");
    assert.equal(getLocalized(item, "name", "en"), "Premium Package");
    assert.equal(getLocalized({}, "name", "ar", "الافتراضي"), "الافتراضي");
  });

  it("normalizeDigits correctly converts Eastern Arabic digits to ASCII digits", () => {
    assert.equal(normalizeDigits("٠٥٠١٢٣٤٥٦٧"), "0501234567");
    assert.equal(normalizeDigits("۰۵۰۱۲۳۴۵۶۷"), "0501234567");
    assert.equal(normalizeDigits("0501234567"), "0501234567");
  });
});

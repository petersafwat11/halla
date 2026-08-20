const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const LOCALES_DIR = path.resolve(__dirname, "..", "..", "localization", "locales");

const arEvents = JSON.parse(
  fs.readFileSync(path.join(LOCALES_DIR, "ar", "events.json"), "utf8")
);
const enEvents = JSON.parse(
  fs.readFileSync(path.join(LOCALES_DIR, "en", "events.json"), "utf8")
);

test("Arabic events.json includes all required i18next v4 plural categories", () => {
  const requiredPluralKeys = [
    "guestCount_zero",
    "guestCount_one",
    "guestCount_two",
    "guestCount_few",
    "guestCount_many",
    "guestCount_other",
  ];

  for (const key of requiredPluralKeys) {
    assert.ok(
      typeof arEvents[key] === "string" && arEvents[key].length > 0,
      `ar/events.json must have non-empty key '${key}'`
    );
  }
});

test("English events.json includes required plural categories", () => {
  const requiredPluralKeys = [
    "guestCount_zero",
    "guestCount_one",
    "guestCount_other",
  ];

  for (const key of requiredPluralKeys) {
    assert.ok(
      typeof enEvents[key] === "string" && enEvents[key].length > 0,
      `en/events.json must have non-empty key '${key}'`
    );
  }
});

// CLDR plural rule for Arabic (matches i18next Intl.PluralRules behavior):
// zero: n = 0; one: n = 1; two: n = 2; few: n % 100 in 3..10;
// many: n % 100 in 11..99; other: everything else (100, 101, 102, ...).
const getArabicPluralCategory = (n) => {
  if (n === 0) return "zero";
  if (n === 1) return "one";
  if (n === 2) return "two";
  const mod100 = n % 100;
  if (mod100 >= 3 && mod100 <= 10) return "few";
  if (mod100 >= 11 && mod100 <= 99) return "many";
  return "other";
};

// Plan §1C: test at least 0, 1, 2, 3, 4, 10, 11, 99, and 102.
const TEST_MATRIX = [
  { count: 0, category: "zero" },
  { count: 1, category: "one" },
  { count: 2, category: "two" },
  { count: 3, category: "few" },
  { count: 4, category: "few" },
  { count: 10, category: "few" },
  { count: 11, category: "many" },
  { count: 99, category: "many" },
  { count: 100, category: "other" },
  { count: 101, category: "other" },
  { count: 102, category: "other" },
];

test("Arabic plural category classification covers the required test matrix", () => {
  for (const { count, category } of TEST_MATRIX) {
    assert.equal(
      getArabicPluralCategory(count),
      category,
      `count ${count} must classify as '${category}'`
    );
    // The platform Intl engine must agree with the classification.
    if (typeof Intl !== "undefined" && Intl.PluralRules) {
      assert.equal(
        new Intl.PluralRules("ar").select(count),
        category,
        `Intl.PluralRules('ar').select(${count}) must be '${category}'`
      );
    }
  }
});

test("i18next resolves the real Arabic guest-count plural resources for the matrix", async () => {
  const i18next = require("i18next");
  const instance = i18next.createInstance();
  await instance.init({
    lng: "ar",
    fallbackLng: "ar",
    compatibilityJSON: "v4",
    resources: { ar: { events: arEvents } },
  });

  for (const { count, category } of TEST_MATRIX) {
    const resolved = instance.t("events:guestCount", { count });
    const expected = arEvents[`guestCount_${category}`].replace(
      "{{count}}",
      String(count)
    );
    assert.equal(
      resolved,
      expected,
      `count ${count} must resolve the '${category}' plural form`
    );
  }
});

test("i18next resolves the real English guest-count plural resources", async () => {
  const i18next = require("i18next");
  const instance = i18next.createInstance();
  await instance.init({
    lng: "en",
    fallbackLng: "en",
    compatibilityJSON: "v4",
    resources: { en: { events: enEvents } },
  });

  assert.equal(instance.t("events:guestCount", { count: 0 }), "0 guests");
  assert.equal(instance.t("events:guestCount", { count: 1 }), "1 guest");
  assert.equal(instance.t("events:guestCount", { count: 10 }), "10 guests");
  assert.equal(instance.t("events:guestCount", { count: 102 }), "102 guests");
});

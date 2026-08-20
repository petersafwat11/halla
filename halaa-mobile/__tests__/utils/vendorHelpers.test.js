const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractCategoriesArray,
  buildServiceCategoriesPayload,
  VENDOR_CATEGORY_KEYS,
} = require("../../utils/vendorHelpers.js");

test("extractCategoriesArray handles backend object format", () => {
  const input = {
    mediaProduction: ["weddings"],
    foodAndBeverages: [],
    invalidKey: ["something"],
  };
  const result = extractCategoriesArray(input);
  assert.ok(result.includes("mediaProduction"));
  assert.ok(result.includes("foodAndBeverages"));
});

test("extractCategoriesArray handles flat string arrays", () => {
  const input = ["eventPlanning", "mediaProduction"];
  const result = extractCategoriesArray(input);
  assert.deepEqual(result, ["eventPlanning", "mediaProduction"]);
});

test("extractCategoriesArray handles nullish and empty values", () => {
  assert.deepEqual(extractCategoriesArray(null), []);
  assert.deepEqual(extractCategoriesArray(undefined), []);
  assert.deepEqual(extractCategoriesArray({}), []);
  assert.deepEqual(extractCategoriesArray([]), []);
});

test("buildServiceCategoriesPayload converts array to backend object shape", () => {
  const input = ["mediaProduction", "foodAndBeverages", "unrecognizedKey"];
  const result = buildServiceCategoriesPayload(input);
  assert.deepEqual(result, {
    mediaProduction: [],
    foodAndBeverages: [],
  });
});

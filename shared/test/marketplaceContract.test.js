import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseDistrictIds,
  marketplaceSortOptions,
  getPublicVendorsQuerySchema,
  getPublicServicesQuerySchema,
} from "../src/schemas/vendor.js";
import { publicVendorKeys, marketplaceKeys } from "../src/utils/queryKeys.js";

describe("Marketplace Query Contracts (@halaa/shared)", () => {
  describe("parseDistrictIds", () => {
    it("parses comma-separated numeric strings into integer array", () => {
      assert.deepEqual(parseDistrictIds("1, 2,3, 4"), [1, 2, 3, 4]);
    });

    it("parses array of numbers and strings into integer array", () => {
      assert.deepEqual(parseDistrictIds([10, "20", 30]), [10, 20, 30]);
    });

    it("parses single integer into single element array", () => {
      assert.deepEqual(parseDistrictIds(5), [5]);
    });

    it("returns undefined for nullish, empty, or non-numeric inputs", () => {
      assert.equal(parseDistrictIds(""), undefined);
      assert.equal(parseDistrictIds(null), undefined);
      assert.equal(parseDistrictIds(undefined), undefined);
      assert.equal(parseDistrictIds([]), undefined);
      assert.equal(parseDistrictIds("abc, def"), undefined);
    });
  });

  describe("getPublicVendorsQuerySchema", () => {
    it("parses valid query with multi-districts, price, rating, and sort", () => {
      const parsed = getPublicVendorsQuerySchema.parse({
        page: "2",
        limit: "15",
        search: "catering",
        category: "foodAndBeverages",
        regionId: "1",
        cityId: "3",
        districtIds: "101,102,103",
        minPrice: "100",
        maxPrice: "500",
        minRating: "4",
        sort: "rating",
        lang: "en",
      });

      assert.equal(parsed.page, 2);
      assert.equal(parsed.limit, 15);
      assert.equal(parsed.search, "catering");
      assert.equal(parsed.category, "foodAndBeverages");
      assert.equal(parsed.regionId, 1);
      assert.equal(parsed.cityId, 3);
      assert.deepEqual(parsed.districtIds, [101, 102, 103]);
      assert.equal(parsed.minPrice, 100);
      assert.equal(parsed.maxPrice, 500);
      assert.equal(parsed.minRating, 4);
      assert.equal(parsed.sort, "rating");
      assert.equal(parsed.lang, "en");
    });

    it("aliases singular districtId to districtIds array when districtIds is omitted", () => {
      const parsed = getPublicVendorsQuerySchema.parse({
        districtId: "42",
      });
      assert.deepEqual(parsed.districtIds, [42]);
    });

    it("aliases rating to minRating when minRating is omitted", () => {
      const parsed = getPublicVendorsQuerySchema.parse({
        rating: "4.5",
      });
      assert.equal(parsed.minRating, 4.5);
    });

    it("applies default pagination, sort, and lang", () => {
      const parsed = getPublicVendorsQuerySchema.parse({});
      assert.equal(parsed.page, 1);
      assert.equal(parsed.limit, 12);
      assert.equal(parsed.sort, "default");
      assert.equal(parsed.lang, "ar");
    });
  });

  describe("getPublicServicesQuerySchema", () => {
    it("parses valid query with multi-districts and price bounds", () => {
      const parsed = getPublicServicesQuerySchema.parse({
        districtIds: [5, 10],
        minPrice: "50",
      });
      assert.deepEqual(parsed.districtIds, [5, 10]);
      assert.equal(parsed.minPrice, 50);
      assert.equal(parsed.page, 1);
      assert.equal(parsed.limit, 20);
    });

    it("aliases singular districtId to districtIds array", () => {
      const parsed = getPublicServicesQuerySchema.parse({
        districtId: "99",
      });
      assert.deepEqual(parsed.districtIds, [99]);
    });
  });

  describe("Query Keys", () => {
    it("publicVendorKeys produces stable canonical key arrays", () => {
      assert.deepEqual(publicVendorKeys.all, ["vendors"]);
      assert.deepEqual(publicVendorKeys.categories(), ["vendors", "categories"]);
      assert.deepEqual(publicVendorKeys.publicList({ cityId: 1 }), ["vendors", "public", { cityId: 1 }]);
      assert.deepEqual(publicVendorKeys.publicDetail("v123"), ["vendors", "public", "detail", "v123"]);
    });

    it("marketplaceKeys produces stable canonical key arrays", () => {
      assert.deepEqual(marketplaceKeys.all, ["marketplace"]);
      assert.deepEqual(marketplaceKeys.categories(), ["marketplace", "categories"]);
      assert.deepEqual(marketplaceKeys.vendors({ districtIds: "1,2" }), ["marketplace", "vendors", { districtIds: "1,2" }]);
      assert.deepEqual(marketplaceKeys.vendor("v456"), ["marketplace", "vendor", "v456"]);
    });
  });
});

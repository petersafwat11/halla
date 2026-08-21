import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marketplaceKeys } from "../../hooks/marketplace/keys.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 4.2 Mobile: Marketplace Filter Contract (MKT-01, MKT-02)", () => {
  it("Marketplace.js passes full districtIds without truncating to [0]", () => {
    const screenFile = path.join(ROOT, "screens/common/Marketplace.js");
    const content = fs.readFileSync(screenFile, "utf-8");

    // Must NOT contain the old truncation
    assert.equal(
      content.includes("districtId: filters.districtIds?.[0]"),
      false,
      "Marketplace.js must NOT truncate districtIds to first element [0]"
    );

    // Must pass districtIds
    assert.ok(
      content.includes("districtIds: filters.districtIds"),
      "Marketplace.js must pass full districtIds in queryFilters"
    );
  });

  it("hooks/marketplace/queries.js _buildVendorsPath serializes districtIds array to CSV", () => {
    const queriesFile = path.join(ROOT, "hooks/marketplace/queries.js");
    const content = fs.readFileSync(queriesFile, "utf-8");

    assert.ok(
      content.includes("districtIds"),
      "_buildVendorsPath must handle districtIds"
    );
    assert.ok(
      content.includes("params.districtIds.join(\",\")"),
      "_buildVendorsPath must serialize districtIds array to comma-separated values"
    );
  });

  it("marketplaceKeys produces stable canonical keys for query cache", () => {
    const filters = { districtIds: [101, 102], rating: 4 };
    const listKey = marketplaceKeys.vendors(filters);
    assert.deepEqual(listKey, ["marketplace", "vendors", filters]);

    const detailKey = marketplaceKeys.vendor("vendor-99");
    assert.deepEqual(detailKey, ["marketplace", "vendor", "vendor-99"]);
  });
});

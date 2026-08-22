import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vendorsKeys } from "../../hooks/vendors/keys.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 4.2 Web: Marketplace Filter Contract (MKT-01, MKT-02)", () => {
  it("MarketplaceView.jsx passes full districtIds array instead of truncating to [0]", () => {
    const viewFile = path.join(
      ROOT,
      "app/[lang]/market-place/_components/MarketplaceView.jsx"
    );
    const content = fs.readFileSync(viewFile, "utf-8");

    // Must NOT contain the old buggy line
    assert.equal(
      content.includes("districtId: state.districtIds?.[0]"),
      false,
      "MarketplaceView must NOT truncate districtIds to first element [0]"
    );

    // Must pass districtIds
    assert.ok(
      content.includes("districtIds: state.districtIds"),
      "MarketplaceView must pass districtIds array/string to query"
    );
  });

  it("usePublicVendors query hook preserves and serializes multi-district districtIds", () => {
    const queriesFile = path.join(ROOT, "hooks/vendors/queries.js");
    const content = fs.readFileSync(queriesFile, "utf-8");

    assert.ok(
      content.includes("districtIds"),
      "usePublicVendors must support districtIds parameter"
    );
    assert.ok(
      content.includes("Array.isArray(districtIds) ? districtIds.join(\",\") : districtIds"),
      "usePublicVendors must serialize districtIds array to comma-separated values"
    );
  });

  it("vendorsKeys query factory produces stable publicList and publicDetail keys", () => {
    const filters = { districtIds: "101,102", page: 1, limit: 12 };
    const listKey = vendorsKeys.publicList(filters);
    assert.deepEqual(listKey, ["vendors", "public", filters]);

    const detailKey = vendorsKeys.publicDetail("vendor-123");
    assert.deepEqual(detailKey, ["vendors", "public", "detail", "vendor-123"]);
  });
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");

test("Session 2.3 Mobile: Bulk API Contract & Mutations (ADM-04)", () => {
  const filePath = path.join(repoRoot, "halaa-mobile/hooks/admin/mutations.js");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.ok(
    content.includes('import { toBulkIdsPayload } from "@halaa/shared/utils/adapters"') ||
    content.includes("toBulkIdsPayload"),
    "Must import toBulkIdsPayload in mobile hooks/admin/mutations.js"
  );

  // Verify bulk mutations use toBulkIdsPayload
  assert.match(content, /useBulkDeleteHosts[\s\S]*?toBulkIdsPayload\(hostIds\)/);
  assert.match(content, /useBulkDeleteVendors[\s\S]*?toBulkIdsPayload\(vendorIds\)/);
  assert.match(content, /useBulkApproveVendors[\s\S]*?toBulkIdsPayload\(vendorIds\)/);
  assert.match(content, /useBulkSuspendVendors[\s\S]*?toBulkIdsPayload\(vendorIds\)/);
  assert.match(content, /useBulkDeleteModerators[\s\S]*?toBulkIdsPayload\(moderatorIds\)/);
  assert.match(content, /useBulkSuspendModerators[\s\S]*?toBulkIdsPayload\(moderatorIds\)/);
  assert.match(content, /useBulkDeleteEvents[\s\S]*?toBulkIdsPayload\(eventIds\)/);
  assert.match(content, /useBulkCancelEvents[\s\S]*?toBulkIdsPayload\(eventIds\)/);
});

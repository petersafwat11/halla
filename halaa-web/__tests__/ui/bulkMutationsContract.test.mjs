import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

describe("Session 2.3 Web: Bulk API Contract & Mutations (ADM-04)", () => {
  it("halaa-web hooks/admin/mutations.js imports toBulkIdsPayload and uses it across all bulk mutations", () => {
    const filePath = path.join(repoRoot, "halaa-web/hooks/admin/mutations.js");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(
      content.includes('import { toBulkIdsPayload } from "@halaa/shared/utils/adapters"') ||
      content.includes("toBulkIdsPayload"),
      "Must import toBulkIdsPayload in hooks/admin/mutations.js"
    );

    // Verify bulk mutations wrap with toBulkIdsPayload
    assert.match(content, /bulkDelete:\s*\{\s*mutationFn:\s*\(hostIds\)\s*=>\s*apiRequest\(\{\s*method:\s*"POST",\s*path:\s*API_PATHS\.admin\.hosts\.bulkDelete,\s*data:\s*toBulkIdsPayload\(hostIds\)/);
    assert.match(content, /bulkDelete:\s*\{\s*mutationFn:\s*\(vendorIds\)\s*=>\s*apiRequest\(\{\s*method:\s*"POST",\s*path:\s*API_PATHS\.admin\.vendors\.bulkDelete,\s*data:\s*toBulkIdsPayload\(vendorIds\)/);
    assert.match(content, /bulkStatus:\s*\{\s*mutationFn:\s*\(\{ vendorIds, ids, status \}\)\s*=>\s*apiRequest\(\{\s*method:\s*"POST",\s*path:\s*API_PATHS\.admin\.vendors\.bulkStatus,\s*data:\s*\{\s*\.\.\.toBulkIdsPayload\(vendorIds \|\| ids\),\s*status\s*\}/);
    assert.match(content, /bulkDelete:\s*\{\s*mutationFn:\s*\(moderatorIds\)\s*=>\s*apiRequest\(\{\s*method:\s*"POST",\s*path:\s*API_PATHS\.admin\.moderators\.bulkDelete,\s*data:\s*toBulkIdsPayload\(moderatorIds\)/);
    assert.match(content, /bulkDelete:\s*\{\s*mutationFn:\s*\(eventIds\)\s*=>\s*apiRequest\(\{\s*method:\s*"POST",\s*path:\s*API_PATHS\.admin\.events\.bulkDelete,\s*data:\s*toBulkIdsPayload\(eventIds\)/);
  });

  it("halaa-web hooks/events/mutations/useEventCrudMutation.js uses toBulkIdsPayload for bulkDeleteEvents", () => {
    const filePath = path.join(repoRoot, "halaa-web/hooks/events/mutations/useEventCrudMutation.js");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(
      content.includes("toBulkIdsPayload"),
      "Must use toBulkIdsPayload in useEventCrudMutation.js"
    );
    assert.match(content, /bulkDeleteEvents:\s*\{\s*mutationFn:\s*\(eventIds\)\s*=>\s*apiRequest\(\{\s*method:\s*"POST",\s*path:\s*API_PATHS\.events\.bulkDeleteEvents,\s*data:\s*toBulkIdsPayload\(eventIds\)/);
  });
});

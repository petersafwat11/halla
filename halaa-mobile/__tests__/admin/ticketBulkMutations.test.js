const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");

test("Session 2.4 Mobile: Ticket Bulk Mutations & Config (ADM-04, ADM-07)", () => {
  const configPath = path.join(repoRoot, "halaa-mobile/config/api.js");
  const configContent = fs.readFileSync(configPath, "utf-8");

  assert.match(configContent, /BULK_DELETE:\s*API_PATHS\.tickets\.bulkDelete/);
  assert.match(configContent, /BULK_STATUS:\s*API_PATHS\.tickets\.bulkStatus/);

  const mutationsPath = path.join(repoRoot, "halaa-mobile/hooks/admin/mutations.js");
  const mutationsContent = fs.readFileSync(mutationsPath, "utf-8");

  // useBulkDeleteTickets
  assert.match(
    mutationsContent,
    /export function useBulkDeleteTickets\(\)[\s\S]*?adminRequest\([\s\S]*?BULK_DELETE[\s\S]*?toBulkIdsPayload\(ticketIds\)/
  );

  // useBulkResolveTickets
  assert.match(
    mutationsContent,
    /export function useBulkResolveTickets\(\)[\s\S]*?adminRequest\([\s\S]*?BULK_STATUS[\s\S]*?status:\s*"resolved"/
  );
});

import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

describe("Session 2.4 Web: Ticket Transitions & Bulk Operations (ADM-05, ADM-06, ADM-07)", () => {
  it("old ticket URLs redirect to the list", () => {
    const content = fs.readFileSync(path.join(repoRoot, "halaa-web/app/[lang]/admin-dash/tickets/[id]/page.js"), "utf-8");
    assert.match(content, /redirect/);
    assert.doesNotMatch(content, /TicketDetailsContent/);
  });

  it("TicketTableContent.jsx & TicketsTable.jsx use one-confirmation bulk operations (ADM-07)", () => {
    const tablePath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/tickets/_components/TicketsTable.jsx"
    );
    const contentPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/tickets/_components/TicketTableContent.jsx"
    );

    const tableContent = fs.readFileSync(tablePath, "utf-8");
    const content = fs.readFileSync(contentPath, "utf-8");

    // TicketsTable must instantiate bulkDelete and bulkStatus mutations
    assert.match(tableContent, /useTicketMutation\("bulkDelete"\)/);
    assert.match(tableContent, /useTicketMutation\("bulkStatus"\)/);
    assert.match(tableContent, /handleBulkDelete/);
    assert.match(tableContent, /handleBulkResolve/);

    // TicketTableContent must delegate bulk actions to handleBulkResolve and handleBulkDelete without per-item loop prompts
    assert.match(content, /handleBulkResolve\(ids\)/);
    assert.match(content, /handleBulkDelete\(ids\)/);
  });

  it("useTicketMutation supports bulkDelete and bulkStatus (ADM-04, ADM-07)", () => {
    const filePath = path.join(repoRoot, "halaa-web/hooks/tickets/mutations.js");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.match(content, /bulkDelete:\s*\{\s*mutationFn:\s*\(ticketIds\)\s*=>/);
    assert.match(content, /bulkStatus:\s*\{\s*mutationFn:\s*\(\{ ticketIds, ids, status, resolution \}\)\s*=>/);
    assert.match(content, /toBulkIdsPayload/);
  });
});

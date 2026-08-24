import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("RTL-03 + HOST-BLUEPRINT §6: TicketCard formats dates and isolates them first-strong", () => {
  const file = path.join(mobileRoot, "components/tickets/TicketCard.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes("formatDateTime("), "TicketCard must use formatDateTime");
  assert.ok(
    content.includes("isolateAuto(formattedDate)"),
    "TicketCard must wrap formattedDate in a first-strong isolate — an LTR isolate forces a wrong base direction around Arabic-formatted date segments"
  );
  assert.ok(
    !content.includes("isolateLtr(formattedDate)"),
    "TicketCard must not force an LTR base direction around localized date output"
  );
  assert.ok(!content.includes("formatDate(ticket.createdAt)"), "TicketCard must not use custom separate split function");
});

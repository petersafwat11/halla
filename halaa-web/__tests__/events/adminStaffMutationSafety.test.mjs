import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

test("EVT-13: AdminEventHeader uses dedicated staff mutations instead of generic updateEvent", () => {
  const source = read("components", "event-detail", "AdminEventHeader.jsx");

  // Must import and use useEventMutation
  assert.match(
    source,
    /useEventMutation\(["']addStaff["']\)/,
    "AdminEventHeader must instantiate addStaff mutation"
  );
  assert.match(
    source,
    /useEventMutation\(["']updateStaff["']\)/,
    "AdminEventHeader must instantiate updateStaff mutation"
  );
  assert.match(
    source,
    /useEventMutation\(["']deleteStaff["']\)/,
    "AdminEventHeader must instantiate deleteStaff mutation"
  );

  // Handlers must call addStaffMutation, updateStaffMutation, deleteStaffMutation
  assert.match(
    source,
    /await\s+addStaffMutation\.mutateAsync/,
    "handleAddStaff must call addStaffMutation.mutateAsync"
  );
  assert.match(
    source,
    /await\s+updateStaffMutation\.mutateAsync/,
    "handleEditStaff must call updateStaffMutation.mutateAsync"
  );
  assert.match(
    source,
    /await\s+deleteStaffMutation\.mutateAsync/,
    "handleDeleteStaff must call deleteStaffMutation.mutateAsync"
  );

  // Must NOT mutate staffList via updateEvent
  assert.doesNotMatch(
    source,
    /updateEvent\.mutateAsync\(\s*\{[\s\S]*?staffList/,
    "AdminEventHeader must not call updateEvent with staffList"
  );
});

test("EVT-14: StaffTokensList supports TanStack Query v5 isPending on revoke mutation", () => {
  const source = read("components", "event-detail", "StaffTokensList.jsx");

  assert.match(
    source,
    /revokeMutation\.isPending\s*\|\|\s*revokeMutation\.isLoading/,
    "StaffTokensList revoke button must check isPending || isLoading"
  );
});

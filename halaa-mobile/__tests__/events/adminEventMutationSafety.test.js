const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("EVT-06: Admin event filter IDs do not contain 'suspended'", () => {
  const source = read("components", "admin-dashboard", "events", "AdminEventList.js");

  assert.doesNotMatch(
    source,
    /["']suspended["']/,
    "AdminEventList.js must not include 'suspended' in filter IDs or bulk actions"
  );

  assert.match(
    source,
    /useBulkCancelEvents/,
    "AdminEventList.js must use useBulkCancelEvents"
  );
});

test("EVT-06: Admin mutations export useBulkCancelEvents with status 'cancelled'", () => {
  const source = read("hooks", "admin", "mutations.js");

  assert.match(
    source,
    /export function useBulkCancelEvents\(\) \{[\s\S]*?status:\s*["']cancelled["']/,
    "useBulkCancelEvents must send status: 'cancelled'"
  );
});

test("EVT-14: Staff portal LoginView supports TanStack Query v5 isPending", () => {
  const source = read("components", "common", "staff-portal", "LoginView.js");

  assert.match(
    source,
    /verifyMutation\.isPending\s*\|\|\s*verifyMutation\.isLoading/,
    "LoginView.js must check isPending || isLoading on verifyMutation"
  );
});

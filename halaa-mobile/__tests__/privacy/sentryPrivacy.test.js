const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../../App.js"), "utf8");

test("Sentry disables default PII and scrubs errors, traces and breadcrumbs", () => {
  assert.match(source, /sendDefaultPii:\s*false/);
  assert.match(source, /beforeSend:\s*scrubPII/);
  assert.match(source, /beforeSendTransaction:\s*scrubPII/);
  assert.match(source, /beforeBreadcrumb:/);
  assert.match(source, /delete event\.request\?\.query_string/);
  assert.match(source, /delete event\.user\.ip_address/);
  assert.match(source, /redactDeep\(event\.breadcrumbs\)/);
  assert.match(source, /redactDeep\(event\.exception\)/);
});

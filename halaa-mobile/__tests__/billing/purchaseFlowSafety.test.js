const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../hooks/purchases/usePurchaseFlow.js"),
  "utf8"
);

test("purchase reconciliation has an overall deadline and bounded attempts", () => {
  assert.match(source, /pollAttempts\s*=\s*12/);
  assert.match(source, /pollTimeoutMs\s*=\s*30000/);
  assert.match(source, /const deadline = Date\.now\(\) \+ pollTimeoutMs/);
  assert.match(source, /Date\.now\(\) >= deadline/);
});

test("transient reconcile failures remain refreshable and observable", () => {
  assert.match(source, /reason:\s*"reconcile_unavailable"/);
  assert.match(source, /category:\s*"purchase\.flow"/);
  assert.match(source, /errorCode/);
  assert.match(source, /httpStatus/);
});

test("purchase telemetry excludes transaction and receipt fields", () => {
  const breadcrumbBlock = source.slice(
    source.indexOf("const addFlowBreadcrumb"),
    source.indexOf("export function usePurchaseFlow")
  );
  assert.doesNotMatch(breadcrumbBlock, /transactionId\s*:/);
  assert.doesNotMatch(breadcrumbBlock, /receipt\s*:/);
  assert.doesNotMatch(breadcrumbBlock, /customerInfo\s*:/);
});

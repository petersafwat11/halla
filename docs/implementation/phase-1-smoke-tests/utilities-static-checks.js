#!/usr/bin/env node
/**
 * Phase 1b static contract checks.
 *
 * Mirror of the Phase 1a static checks. Run from repo root:
 *   node docs/implementation/phase-1-smoke-tests/utilities-static-checks.js
 *
 * Asserts that the five utilities exist, are wired to one consumer each,
 * and don't reintroduce the problems Phase 1b is supposed to close.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const checks = [];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (e) {
    checks.push({ name, ok: false, error: e.message });
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// 1. Idempotency: model + util + middleware + wired consumer
check("idempotency: model + util + middleware + wired addons.purchase", () => {
  const m = read("labbe-backend-/models/IdempotencyKeyModel.js");
  expect(m.includes("expireAfterSeconds"), "TTL index missing on idempotency model");
  expect(m.includes("requestHash"), "requestHash field missing");

  const u = read("labbe-backend-/src/shared/utils/idempotency.js");
  expect(u.includes("withIdempotency"), "withIdempotency export missing");

  const mw = read("labbe-backend-/src/shared/middleware/idempotency.js");
  expect(mw.includes("Idempotency-Key"), "middleware does not reference Idempotency-Key header");

  const r = read("labbe-backend-/src/modules/addons/addons.routes.js");
  expect(r.includes("idempotency("), "addons.purchase route does not use idempotency middleware");
});

// 2. S3 hardened: no silent local fallback at import time, getFileUrl throws if S3 mode mismatched
check("s3Upload: fail-closed in production + boot-deferred error in dev", () => {
  const s = read("labbe-backend-/src/shared/utils/s3Upload.js");
  expect(s.includes("ALLOW_LOCAL_UPLOADS"), "Hardened S3 path is missing the dev opt-in flag");
  expect(/S3 is not configured/.test(s), "Missing fail-closed error message");
  expect(/multer returned a local-disk file/.test(s), "getFileUrl should refuse a local file in S3 mode");
});

// 3. Audit log: middleware + helper + wired consumer
check("auditLog: helper + middleware + vendor.status_change wired", () => {
  expect(exists("labbe-backend-/src/shared/utils/auditLog.js"), "auditLog helper missing");
  expect(exists("labbe-backend-/src/shared/middleware/auditLog.js"), "auditLog middleware missing");
  const r = read("labbe-backend-/src/modules/admin/admin.routes.js");
  expect(r.includes("auditLog("), "vendor status route is not wrapped in auditLog");
  expect(r.includes("vendor.status_change"), "auditLog action key not vendor.status_change");
});

// 4. Timezone utility wired into the launch cron
check("timezone: utility + cron uses isDue + dropped getHours match", () => {
  const u = read("labbe-backend-/src/shared/utils/timezone.js");
  expect(u.includes("parseEventTime"), "parseEventTime missing");
  expect(u.includes("isDue"), "isDue missing");

  const c = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  expect(c.includes("require(\"./timezone\")"), "scheduledTasks does not import timezone util");
  expect(c.includes("isDue("), "scheduledTasks does not call isDue");
  expect(!/launchSettings\.scheduledTime": currentTime/.test(c), "Old string-match comparison still present");
});

// 5. Payment scaffold: factory + stub/moyasar + wired in subscribe
check("payment: factory + stub + moyasar + subscribe wired", () => {
  expect(exists("labbe-backend-/src/infrastructure/paymentProvider/index.js"), "factory missing");
  expect(exists("labbe-backend-/src/infrastructure/paymentProvider/stub.js"), "stub missing");
  expect(exists("labbe-backend-/src/infrastructure/paymentProvider/moyasar.js"), "moyasar missing");

  const idx = read("labbe-backend-/src/infrastructure/paymentProvider/index.js");
  expect(idx.includes("MOYASAR_API_KEY"), "factory does not branch on MOYASAR_API_KEY");
  expect(idx.includes("withIdempotency"), "factory does not use idempotency utility");

  const sub = read("labbe-backend-/src/modules/subscriptions/subscriptions.service.js");
  expect(sub.includes("paymentProvider.charge"), "subscriptions.subscribe does not call paymentProvider.charge");
});

let failed = 0;
for (const c of checks) {
  if (c.ok) {
    console.log(`PASS  ${c.name}`);
  } else {
    failed++;
    console.error(`FAIL  ${c.name}\n      ${c.error}`);
  }
}
if (failed) {
  console.error(`\n${failed} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed.`);

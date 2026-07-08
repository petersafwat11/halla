/**
 * Post-deletion RevenueCat webhook handling (DEL-02 · LEGAL §7 · DEC-04).
 *
 * A trailing store webhook for a user who deleted their Halaa account must be
 * classified DETERMINISTICALLY as `account_deleted` (terminal, non-retryable,
 * HTTP 200) — NOT an `unknown_user` permanent dead-letter and NOT retryable —
 * so it does not linger forever. Purchases stay with the original App User ID
 * (DEC-04); there is nothing to transfer or grant. Runs against an ephemeral
 * replica set; the RevenueCat snapshot is stubbed (no provider access).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const controller = require("../src/modules/payments/revenuecat.controller");
const rcApi = require("../src/modules/payments/revenuecat.api");
const User = require("../models/UserModel");
const RevenueCatEvent = require("../models/RevenueCatEventModel");
const AccountDeletionRequest = require("../models/AccountDeletionRequestModel");
const deletionService = require("../src/modules/account-deletion/deletion.service");
const s3 = require("../src/shared/utils/s3Upload");

const AUTH = "post-del-auth";
const origDelete = s3.deleteFromS3;

const mkReq = (body, auth = AUTH) => ({ body, get: (h) => (h.toLowerCase() === "authorization" ? auth : undefined) });
const call = (body, auth) =>
  new Promise((resolve, reject) => {
    const res = { statusCode: 0, payload: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.payload = b; resolve(res); return res; };
    controller.webhook(mkReq(body, auth), res, (e) => (e ? reject(e) : resolve(res)));
  });

const body = (over = {}, evOver = {}) => ({
  api_version: "1.0",
  event: {
    id: "e-" + Math.random().toString(36).slice(2),
    type: "EXPIRATION",
    app_user_id: "bill-del-1",
    store: "APP_STORE",
    environment: "PRODUCTION",
    transaction_id: "txn-" + Math.random().toString(36).slice(2),
    original_transaction_id: "otxn-del-1",
    product_id: "com.halaa.premium_monthly_100",
    entitlement_ids: ["recurring_access"],
    expiration_at_ms: Date.now(),
    ...evOver,
  },
  ...over,
});

test.before(async () => {
  await db.start();
  process.env.REVENUECAT_WEBHOOK_AUTH = AUTH;
  delete process.env.REVENUECAT_APP_ID;
  delete process.env.REVENUECAT_ENVIRONMENT;
  rcApi.getRecurringSnapshot = async () => ({ available: true, entitlementActive: false, effectiveProductId: null, expiresAtMs: Date.now(), reason: null });
  // Isolated S3 stub — deletion must not touch real S3.
  s3.deleteFromS3 = async () => true;
});
test.after(async () => {
  s3.deleteFromS3 = origDelete;
  await db.stop();
});
test.beforeEach(async () => { await db.clearAll(); });

test("trailing webhook for a DELETED account → account_deleted (200, not dead_letter)", async () => {
  // Create then delete the user so a tombstone with billingUserId exists.
  const user = await User.create({
    name: "Del", email: "del-1@example.com", mobile: "+966500000021",
    phoneNumber: "+966500000021", password: "password123", role: "host",
    accountType: "personal", billingUserId: "bill-del-1",
  });
  const reqDoc = await deletionService.runDeletion({ userId: user._id });
  assert.ok(reqDoc.billingUserId === "bill-del-1", "tombstone retains billingUserId");

  const res = await call(body());
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, "ignored");
  assert.equal(res.payload.reason, "account_deleted");

  const stored = await RevenueCatEvent.findOne({}).lean();
  assert.equal(stored.status, "ignored");
  assert.equal(stored.reason, "account_deleted");
});

test("webhook for a genuinely unknown user (no tombstone) → dead_letter", async () => {
  const res = await call(body({}, { app_user_id: "bill-nobody", original_transaction_id: "otxn-nobody" }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, "dead_letter");
  assert.equal(res.payload.reason, "unknown_user");
});

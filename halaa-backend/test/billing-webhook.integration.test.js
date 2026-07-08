/**
 * Webhook engine integration tests (BILL-01/02/03 · §10).
 * Runs the REAL controller against an ephemeral MongoMemoryReplSet — real
 * transactions, real unique-index dedupe, real atomic lease claim. Never touches
 * the shared DB; no provider access (the canonical snapshot is stubbed).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");

const controller = require("../src/modules/payments/revenuecat.controller");
const revenuecatService = require("../src/modules/payments/revenuecat.service");
const rcApi = require("../src/modules/payments/revenuecat.api");
const RevenueCatEvent = require("../models/RevenueCatEventModel");
const Subscription = require("../models/SubscriptionModel");
const Payment = require("../models/PaymentModel");
const User = require("../models/UserModel");

const AUTH = "test-webhook-auth-value";
let snapshotStub;

const mkReq = (body, auth = AUTH) => ({ body, get: (h) => (h.toLowerCase() === "authorization" ? auth : undefined) });
// The repo's catchAsync does NOT return the promise (Express never awaits a
// controller), so resolve when the response is actually sent (res.json) or when
// next(err) fires.
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
    type: "INITIAL_PURCHASE",
    app_user_id: "biller-1",
    store: "APP_STORE",
    environment: "PRODUCTION",
    transaction_id: "txn-" + Math.random().toString(36).slice(2),
    original_transaction_id: "otxn-1",
    product_id: "com.halla.premium_monthly_100",
    entitlement_ids: ["recurring_access"],
    price: 26.66,
    price_in_purchased_currency: 100,
    currency: "SAR",
    expiration_at_ms: Date.now() + 30 * 86400000,
    ...evOver,
  },
  ...over,
});

test.before(async () => {
  await db.start();
  process.env.REVENUECAT_WEBHOOK_AUTH = AUTH;
  delete process.env.REVENUECAT_APP_ID;
  delete process.env.REVENUECAT_ENVIRONMENT;
  // Stub the canonical snapshot (no provider access in tests).
  snapshotStub = async () => ({ available: true, entitlementActive: true, effectiveProductId: "com.halla.premium_monthly_100", expiresAtMs: Date.now() + 30 * 86400000, reason: null });
  rcApi.getRecurringSnapshot = (...a) => snapshotStub(...a);
});
test.after(async () => { await db.stop(); });
test.beforeEach(async () => {
  await db.clearAll();
  await User.create({ name: "Biller", email: "biller-1@example.com", phone: "+966500000001", password: "password123", role: "host", accountType: "personal", billingUserId: "biller-1" });
});

// ── auth ─────────────────────────────────────────────────────────────────────
test("rejects a webhook with a bad auth header (401)", async () => {
  const res = await call(body(), "wrong");
  assert.equal(res.statusCode, 401);
  assert.equal(await RevenueCatEvent.countDocuments(), 0);
});

// ── grant + ledger + redaction ───────────────────────────────────────────────
test("INITIAL_PURCHASE grants a subscription, writes purchased-currency ledger, redacts PII", async () => {
  const b = body({}, { subscriber_attributes: { $email: { value: "leak@x.com" } } });
  const res = await call(b);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, "processed");

  const subs = await Subscription.find({});
  assert.equal(subs.length, 1);
  assert.equal(subs[0].provider, "appstore");

  const pay = await Payment.findOne({ providerTransactionId: b.event.transaction_id });
  assert.equal(pay.amount, 100); // PURCHASED currency amount, not the 26.66 USD
  assert.equal(pay.currency, "SAR");
  assert.equal(pay.metadata.priceUsd, 26.66);

  const ev = await RevenueCatEvent.findOne({ eventId: b.event.id });
  assert.equal(ev.status, "processed");
  assert.equal(ev.catalogCode, "premium_monthly_100");
  assert.equal(ev.catalogVersion, "1.0.0");
  assert.ok(ev.resolutionHistory.length >= 1);
  // redacted payload stored, PII removed, typed columns populated
  assert.equal(ev.rawPayload.event.subscriber_attributes, "[REDACTED_PII]");
  assert.equal(ev.priceInPurchasedCurrency, 100);
  assert.equal(ev.transactionId, b.event.transaction_id);
});

// ── idempotency: duplicate + concurrent ──────────────────────────────────────
test("a duplicate delivery (same eventId) does not double-grant", async () => {
  const b = body();
  await call(b);
  const res2 = await call(b);
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.payload.status, "duplicate");
  assert.equal(await Subscription.countDocuments(), 1);
});

test("concurrent deliveries of the same event grant exactly once (atomic lease)", async () => {
  const b = body();
  const [r1, r2] = await Promise.all([call(b), call(b)]);
  assert.equal(await Subscription.countDocuments(), 1);
  const statuses = [r1.payload?.status, r2.payload?.status].sort();
  // one processes; the other is a duplicate ack or a 500 retry — never a 2nd grant
  assert.ok(statuses.includes("processed") || r1.statusCode === 500 || r2.statusCode === 500);
  const ev = await RevenueCatEvent.findOne({ eventId: b.event.id });
  assert.equal(ev.status, "processed");
});

// ── dead-letter / ignore / manual-review persistence ─────────────────────────
test("unmapped product is dead-lettered durably (not dropped, no grant)", async () => {
  const res = await call(body({}, { product_id: "com.halla.nope" }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, "dead_letter");
  assert.equal(res.payload.reason, "unmapped_product");
  assert.equal(await Subscription.countDocuments(), 0);
  assert.equal(await RevenueCatEvent.countDocuments({ status: "dead_letter" }), 1);
});

test("environment mismatch is ignored durably", async () => {
  process.env.REVENUECAT_ENVIRONMENT = "PRODUCTION";
  const res = await call(body({}, { environment: "SANDBOX" }));
  delete process.env.REVENUECAT_ENVIRONMENT;
  assert.equal(res.payload.status, "ignored");
  assert.equal(res.payload.reason, "environment_mismatch");
});

test("unknown user is dead-lettered (never grants)", async () => {
  const res = await call(body({}, { app_user_id: "ghost", original_transaction_id: "o-ghost" }));
  assert.equal(res.payload.status, "dead_letter");
  assert.equal(res.payload.reason, "unknown_user");
});

test("TRANSFER is parked as manual_review (keep with original user, DEC-04)", async () => {
  const res = await call(body({}, { type: "TRANSFER", product_id: undefined, transaction_id: undefined }));
  assert.equal(res.payload.status, "manual_review");
  const ev = await RevenueCatEvent.findOne({ type: "TRANSFER" });
  assert.equal(ev.status, "manual_review");
});

// ── destructive fail-closed ──────────────────────────────────────────────────
test("EXPIRATION with an unavailable snapshot does NOT revoke — 500 retry (P0-08)", async () => {
  // grant first
  const grant = body();
  await call(grant);
  // snapshot now unavailable
  snapshotStub = async () => ({ available: false, entitlementActive: false, effectiveProductId: null, expiresAtMs: null, reason: "http_503" });
  const res = await call(body({}, { type: "EXPIRATION", original_transaction_id: "otxn-1", transaction_id: "t-exp" }));
  assert.equal(res.statusCode, 500);
  const sub = await Subscription.findOne({});
  assert.notEqual(sub.status, "expired"); // access retained
  // restore stub
  snapshotStub = async () => ({ available: true, entitlementActive: false, effectiveProductId: null, expiresAtMs: null });
});

test("EXPIRATION with snapshot inactive revokes exactly the lineage subscription", async () => {
  await call(body());
  snapshotStub = async () => ({ available: true, entitlementActive: false, effectiveProductId: null, expiresAtMs: null });
  const res = await call(body({}, { type: "EXPIRATION", original_transaction_id: "otxn-1", transaction_id: "t-exp2" }));
  assert.equal(res.payload.status, "processed");
  const sub = await Subscription.findOne({});
  assert.equal(sub.status, "expired");
});

test("refund→REFUND_REVERSED restores the EXACT revoked subscription end-to-end (canonical active)", async () => {
  await call(body()); // grant otxn-1
  // support refund with snapshot inactive → revoke exact
  snapshotStub = async () => ({ available: true, entitlementActive: false, effectiveProductId: null, expiresAtMs: null });
  await call(body({}, { type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", original_transaction_id: "otxn-1", transaction_id: "t-rr" }));
  assert.equal((await Subscription.findOne({})).status, "expired");
  // reversal with snapshot active → restore exactly that subscription
  snapshotStub = async () => ({ available: true, entitlementActive: true, effectiveProductId: "com.halla.premium_monthly_100", expiresAtMs: Date.now() + 30 * 86400000 });
  const res = await call(body({}, { type: "REFUND_REVERSED", original_transaction_id: "otxn-1", transaction_id: "t-rr" }));
  assert.equal(res.payload.status, "processed");
  assert.equal((await Subscription.findOne({})).status, "active");
});

test("REFUND_REVERSED on a subscription with NO snapshot is retryable (never blind-restores)", async () => {
  await call(body());
  snapshotStub = async () => ({ available: false, entitlementActive: false });
  const res = await call(body({}, { type: "REFUND_REVERSED", original_transaction_id: "otxn-1", transaction_id: "t-rr2" }));
  assert.equal(res.statusCode, 500);
});

test("a crashed worker's stuck (processing, expired-lease) event is reclaimed + reprocessed", async () => {
  snapshotStub = async () => ({ available: true, entitlementActive: true, effectiveProductId: "com.halla.premium_monthly_100", expiresAtMs: Date.now() + 30 * 86400000 });
  // Simulate a worker that claimed then crashed: processing with a past lease.
  await RevenueCatEvent.create({
    eventId: "stuck-1", type: "INITIAL_PURCHASE", appUserId: "biller-1", productId: "com.halla.premium_monthly_100",
    store: "APP_STORE", environment: "PRODUCTION", transactionId: "t-stuck", originalTransactionId: "otxn-s",
    entitlementIds: ["recurring_access"], priceInPurchasedCurrency: 100, currency: "SAR",
    catalogCode: "premium_monthly_100", status: "processing", processing: true, leaseUntil: new Date(Date.now() - 1000),
    rawPayload: { event: { id: "stuck-1" } },
  });
  const reclaimed = await revenuecatService.reclaimStuckLeases();
  assert.equal(reclaimed.length, 1);
  assert.equal(reclaimed[0].status, "processed");
  assert.equal(await Subscription.countDocuments(), 1);
  const ev = await RevenueCatEvent.findOne({ eventId: "stuck-1" });
  assert.equal(ev.status, "processed");
  assert.equal(ev.processing, false);
});

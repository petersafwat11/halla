/**
 * Staff dead-letter operations + authorization (BILL-09 · §3).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const admin = require("../src/modules/payments/revenuecat.admin.controller");
const rcApi = require("../src/modules/payments/revenuecat.api");
const RevenueCatEvent = require("../models/RevenueCatEventModel");
const Subscription = require("../models/SubscriptionModel");
const User = require("../models/UserModel");

// Permission architecture (authorization for staff ops).
const { canAccessPage } = require("../src/shared/constants/permissions");
const { ADMIN_PAGES } = require("../src/shared/constants");

const staff = { _id: undefined };
const callCtrl = (fn, { params = {}, query = {}, body = {}, user = staff } = {}) =>
  new Promise((resolve, reject) => {
    const res = { statusCode: 0, payload: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.payload = b; resolve(res); return res; };
    fn({ params, query, body, user }, res, (e) => (e ? reject(e) : resolve(res)));
  });

const deadLetterDoc = (over = {}) => ({
  eventId: "dl-" + Math.random().toString(36).slice(2),
  type: "INITIAL_PURCHASE",
  status: "dead_letter",
  reason: "catalog_unavailable",
  appUserId: "biller-1",
  productId: "com.halaa.premium_monthly_100",
  transactionId: "t-" + Math.random().toString(36).slice(2),
  originalTransactionId: "o-1",
  entitlementIds: ["recurring_access"],
  priceInPurchasedCurrency: 100,
  currency: "SAR",
  rawPayload: { api_version: "1.0", event: { id: "x", type: "INITIAL_PURCHASE", app_user_id: "biller-1", store: "APP_STORE", environment: "PRODUCTION", transaction_id: "t-x", original_transaction_id: "o-1", product_id: "com.halaa.premium_monthly_100", entitlement_ids: ["recurring_access"], subscriber_attributes: "[REDACTED_PII]" } },
  resolutionHistory: [{ action: "dead_letter", status: "dead_letter", reason: "catalog_unavailable", actor: "system" }],
  ...over,
});

test.before(async () => {
  await db.start();
  process.env.REVENUECAT_WEBHOOK_AUTH = "x";
  rcApi.getRecurringSnapshot = async () => ({ available: true, entitlementActive: true, effectiveProductId: "com.halaa.premium_monthly_100", expiresAtMs: Date.now() + 1e9 });
});
test.after(async () => { await db.stop(); });
test.beforeEach(async () => {
  await db.clearAll();
  const u = await User.create({ name: "S", email: "s@x.com", phone: "+966500000002", password: "password123", role: "host", accountType: "personal", billingUserId: "biller-1" });
  staff._id = u._id;
});

// ── authorization gate ───────────────────────────────────────────────────────
test("staff dead-letter ops require PAYMENTS 'manage' — hosts/vendors denied, admins allowed", () => {
  assert.equal(canAccessPage({ role: "host" }, ADMIN_PAGES.PAYMENTS, "manage"), false);
  assert.equal(canAccessPage({ role: "vendor" }, ADMIN_PAGES.PAYMENTS, "manage"), false);
  assert.equal(canAccessPage({ role: "moderator" }, ADMIN_PAGES.PAYMENTS, "manage"), false);
  assert.equal(canAccessPage({ role: "admin" }, ADMIN_PAGES.PAYMENTS, "manage"), true);
  assert.equal(canAccessPage({ role: "super_admin" }, ADMIN_PAGES.PAYMENTS, "manage"), true);
});

// ── list / inspect ───────────────────────────────────────────────────────────
test("list returns dead letters; inspect returns redacted payload + history", async () => {
  await RevenueCatEvent.create(deadLetterDoc());
  await RevenueCatEvent.create(deadLetterDoc({ status: "manual_review", reason: "transfer_keep_original_user" }));
  const list = await callCtrl(admin.listDeadLetters, {});
  assert.equal(list.payload.data.total, 2);

  const id = list.payload.data.items[0]._id;
  const insp = await callCtrl(admin.inspectDeadLetter, { params: { id } });
  assert.equal(insp.payload.data.found, true);
  assert.equal(insp.payload.data.event.redactedPayload.event.subscriber_attributes, "[REDACTED_PII]");
  assert.ok(insp.payload.data.event.resolutionHistory.length >= 1);
});

// ── replay after mapping/config correction ───────────────────────────────────
test("replay re-resolves the product and processes it (grants the subscription)", async () => {
  // Dead-lettered while catalog was 'unavailable'; now replayable.
  const ev = await RevenueCatEvent.create(deadLetterDoc());
  const res = await callCtrl(admin.replayDeadLetter, { params: { id: ev._id } });
  assert.equal(res.payload.data.replayed, true);
  assert.equal(res.payload.data.outcome, "processed");
  assert.equal(await Subscription.countDocuments(), 1);
  const after = await RevenueCatEvent.findById(ev._id);
  assert.equal(after.status, "processed");
  assert.ok(after.resolutionHistory.some((h) => h.action === "replay"));
});

test("replay of a still-unmapped product stays dead-lettered (no grant)", async () => {
  const ev = await RevenueCatEvent.create(deadLetterDoc({
    productId: "com.halaa.ghost",
    rawPayload: { api_version: "1.0", event: { id: "y", type: "INITIAL_PURCHASE", app_user_id: "biller-1", store: "APP_STORE", environment: "PRODUCTION", transaction_id: "t-y", original_transaction_id: "o-2", product_id: "com.halaa.ghost", entitlement_ids: ["recurring_access"] } },
  }));
  const res = await callCtrl(admin.replayDeadLetter, { params: { id: ev._id } });
  assert.equal(res.payload.data.outcome, "dead_letter");
  assert.equal(res.payload.data.reason, "unmapped_product");
  assert.equal(await Subscription.countDocuments(), 0);
});

// ── resolve ──────────────────────────────────────────────────────────────────
test("resolve marks the event resolved with actor + reason", async () => {
  const ev = await RevenueCatEvent.create(deadLetterDoc({ status: "manual_review", reason: "transfer_keep_original_user" }));
  const res = await callCtrl(admin.resolveDeadLetter, { params: { id: ev._id }, body: { reason: "migrated manually", note: "support ticket 123" } });
  assert.equal(res.payload.data.resolved, true);
  const after = await RevenueCatEvent.findById(ev._id);
  assert.equal(after.status, "resolved");
  assert.equal(String(after.resolvedBy), String(staff._id));
  assert.ok(after.resolutionHistory.some((h) => h.action === "resolve"));
});

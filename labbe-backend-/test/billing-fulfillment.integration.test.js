/**
 * Add-on + event-entitlement fulfillment integration tests (ADD-01/02 · EVT-01/02 · §7/§8).
 * Ephemeral replica set; no shared DB; no provider access.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const addonsService = require("../src/modules/addons/addons.service");
const addonsQuota = require("../src/modules/addons/addons.quota");
const controller = require("../src/modules/payments/revenuecat.controller");
const Addon = require("../models/AddonModel");
const Subscription = require("../models/SubscriptionModel");
const EventEntitlement = require("../models/EventEntitlementModel");
const Plan = require("../models/PlanModel");
const User = require("../models/UserModel");

const AUTH = "fulfil-auth";
const call = (body) =>
  new Promise((resolve, reject) => {
    const res = { statusCode: 0, payload: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.payload = b; resolve(res); return res; };
    const req = { body, get: (h) => (h.toLowerCase() === "authorization" ? AUTH : undefined) };
    controller.webhook(req, res, (e) => (e ? reject(e) : resolve(res)));
  });

let userId;
const mkActiveSub = async (planCode, over = {}) => {
  const plan = await Plan.getOrCreateByCode(planCode);
  return Subscription.create({ userId, planId: plan._id, status: "active", invitePool: over.invitePool ?? 100, compensationPool: 0, invitesConsumed: over.invitesConsumed ?? 0, activatedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) });
};

test.before(async () => {
  await db.start();
  process.env.REVENUECAT_WEBHOOK_AUTH = AUTH;
  delete process.env.REVENUECAT_APP_ID;
  delete process.env.REVENUECAT_ENVIRONMENT;
});
test.after(async () => { await db.stop(); });
test.beforeEach(async () => {
  await db.clearAll();
  const u = await User.create({ name: "F", email: "f@x.com", phone: "+966500000009", password: "password123", role: "host", accountType: "personal", billingUserId: "fuser" });
  userId = u._id;
});

// ── ADD-ONS ──────────────────────────────────────────────────────────────────
test("extra-invites store grant applies quota atomically and is unique-txn idempotent", async () => {
  const sub = await mkActiveSub("basic_monthly_50", { invitePool: 100 });
  const a1 = await addonsService.grantAddonFromStore({ userId, addonType: "extra_invites", quantity: 50, catalogCode: "extra_invites_50", providerTransactionId: "atxn-1" });
  assert.equal(a1.status, "active");
  assert.equal(a1.grantedDelta, 50);
  assert.equal((await Subscription.findById(sub._id)).invitePool, 150);

  // duplicate delivery → same addon, no double increment
  const a2 = await addonsService.grantAddonFromStore({ userId, addonType: "extra_invites", quantity: 50, catalogCode: "extra_invites_50", providerTransactionId: "atxn-1" });
  assert.equal(String(a2._id), String(a1._id));
  assert.equal((await Subscription.findById(sub._id)).invitePool, 150);
});

test("missing target subscription → failed_quota + refund_required (not silent success)", async () => {
  const a = await addonsService.grantAddonFromStore({ userId, addonType: "extra_invites", quantity: 30, catalogCode: "extra_invites_30", providerTransactionId: "atxn-miss" });
  assert.equal(a.status, "failed_quota");
  assert.equal(a.refundState, "refund_required");
});

test("an in-transaction quota failure ROLLS BACK the addon create → failed_quota, pool unchanged (§10)", async () => {
  const sub = await mkActiveSub("basic_monthly_50", { invitePool: 100 });
  const orig = addonsQuota.applyQuota;
  addonsQuota.applyQuota = async () => { throw new Error("forced in-txn quota failure"); };
  try {
    const a = await addonsService.grantAddonFromStore({ userId, addonType: "extra_invites", quantity: 50, catalogCode: "extra_invites_50", providerTransactionId: "atxn-rollback" });
    assert.equal(a.status, "failed_quota");
    assert.equal(a.refundState, "refund_required");
    // the in-txn `active` create rolled back — the ONLY row is the failed_quota one
    assert.equal(await Addon.countDocuments({ providerTransactionId: "atxn-rollback" }), 1);
    assert.equal(await Addon.countDocuments({ providerTransactionId: "atxn-rollback", status: "active" }), 0);
    // the pool increment rolled back with the aborted transaction
    assert.equal((await Subscription.findById(sub._id)).invitePool, 100);
  } finally {
    addonsQuota.applyQuota = orig;
  }
});

test("event REFUND_REVERSED restores a refunded-before-use package to unused + re-activates access", async () => {
  const b = eventBody({ transaction_id: "etx-rev" });
  await call(b);
  const entBefore = await EventEntitlement.findOne({ providerTransactionId: "etx-rev" });
  await call({ api_version: "1.0", event: { id: "ev-rev-refund", type: "REFUND", app_user_id: "fuser", store: "APP_STORE", environment: "PRODUCTION", transaction_id: "etx-rev", product_id: "com.halla.basic_event_50", entitlement_ids: [] } });
  assert.equal((await EventEntitlement.findOne({ providerTransactionId: "etx-rev" })).status, "refunded");
  const res = await call({ api_version: "1.0", event: { id: "ev-rev-restore", type: "REFUND_REVERSED", app_user_id: "fuser", store: "APP_STORE", environment: "PRODUCTION", transaction_id: "etx-rev", product_id: "com.halla.basic_event_50", entitlement_ids: [] } });
  assert.equal(res.payload.status, "processed");
  const entAfter = await EventEntitlement.findOne({ providerTransactionId: "etx-rev" });
  assert.equal(entAfter.status, "unused");
  assert.equal((await Subscription.findById(entBefore.subscriptionId)).status, "active"); // access restored
});

test("extra-invites refund claws back ONLY the unused delta, never below consumed", async () => {
  const sub = await mkActiveSub("basic_monthly_50", { invitePool: 100, invitesConsumed: 140 });
  await addonsService.grantAddonFromStore({ userId, addonType: "extra_invites", quantity: 50, catalogCode: "extra_invites_50", providerTransactionId: "atxn-2" });
  // pool now 150, consumed 140 → only 10 unused
  const refunded = await addonsService.refundAddonFromStore({ providerTransactionId: "atxn-2" });
  assert.equal(refunded.refundState, "refunded");
  const after = await Subscription.findById(sub._id);
  assert.equal(after.invitePool, 140); // clawed back 10 only; allowance never < consumed(140)
  assert.equal(refunded.clawedBackDelta, 10);
});

test("refund reversal restores exactly the clawed-back delta once", async () => {
  const sub = await mkActiveSub("basic_monthly_50", { invitePool: 100, invitesConsumed: 0 });
  await addonsService.grantAddonFromStore({ userId, addonType: "extra_invites", quantity: 50, catalogCode: "extra_invites_50", providerTransactionId: "atxn-3" });
  await addonsService.refundAddonFromStore({ providerTransactionId: "atxn-3" }); // claws 50 → pool 100
  const rev = await addonsService.reverseAddonRefund({ providerTransactionId: "atxn-3" });
  assert.equal(rev.refundState, "reversed");
  assert.equal((await Subscription.findById(sub._id)).invitePool, 150);
  // idempotent
  await addonsService.reverseAddonRefund({ providerTransactionId: "atxn-3" });
  assert.equal((await Subscription.findById(sub._id)).invitePool, 150);
});

test("design-template store refund is recorded but the service work is NOT undone (DEC-03L)", async () => {
  const a = await addonsService.grantAddonFromStore({ userId, addonType: "design_template", templateType: "animated", catalogCode: "design_template_animated", providerTransactionId: "dtxn-1" });
  assert.equal(a.status, "paid"); // managed-service workflow
  const r = await addonsService.refundAddonFromStore({ providerTransactionId: "dtxn-1" });
  assert.equal(r.refundState, "refunded");
  assert.equal(r.refundReason, "store_forced_refund_non_refundable_policy");
  assert.equal(r.status, "paid"); // work state preserved, not reversed
});

// ── EVENT ENTITLEMENTS (via full webhook) ────────────────────────────────────
const eventBody = (over = {}) => ({
  api_version: "1.0",
  event: { id: "ev-" + Math.random().toString(36).slice(2), type: "NON_RENEWING_PURCHASE", app_user_id: "fuser", store: "APP_STORE", environment: "PRODUCTION", transaction_id: "etx-" + Math.random().toString(36).slice(2), product_id: "com.halla.basic_event_50", entitlement_ids: [], price_in_purchased_currency: 95, currency: "SAR", ...over },
});

test("event package grant creates an unused entitlement + per-event sub and blocks a 2nd buy", async () => {
  const res = await call(eventBody());
  assert.equal(res.payload.status, "processed");
  const ent = await EventEntitlement.findOne({ userId });
  assert.equal(ent.status, "unused");
  assert.equal(ent.resolution, "fulfilled");
  assert.ok(ent.subscriptionId);
  // second-purchase guard sees a usable unused entitlement
  assert.ok(await EventEntitlement.hasUnused(userId));
});

test("event package delivered while a recurring plan is active → manual_review, NOT blocking", async () => {
  await mkActiveSub("basic_monthly_50"); // active pool plan
  const res = await call(eventBody({ transaction_id: "etx-race" }));
  assert.equal(res.payload.status, "processed");
  const ent = await EventEntitlement.findOne({ providerTransactionId: "etx-race" });
  assert.equal(ent.resolution, "manual_review"); // recorded but routed for ops
  assert.equal(ent.subscriptionId, null);
  // must NOT block a future legitimate purchase
  assert.equal(await EventEntitlement.hasUnused(userId), null);
});

test("refund of an unused event package revokes access + keeps the ledger row", async () => {
  const b = eventBody({ transaction_id: "etx-ref" });
  await call(b);
  const refund = { api_version: "1.0", event: { id: "ev-ref", type: "REFUND", app_user_id: "fuser", store: "APP_STORE", environment: "PRODUCTION", transaction_id: "etx-ref", product_id: "com.halla.basic_event_50", entitlement_ids: [] } };
  const res = await call(refund);
  assert.equal(res.payload.status, "processed");
  const ent = await EventEntitlement.findOne({ providerTransactionId: "etx-ref" });
  assert.equal(ent.status, "refunded"); // row preserved (audit), status refunded
  const sub = await Subscription.findById(ent.subscriptionId);
  assert.equal(sub.status, "expired"); // access revoked
});

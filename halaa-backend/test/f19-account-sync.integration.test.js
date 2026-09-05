/**
 * F-19 Account Sync and Cross-Account Isolation Integration Tests (PR5 / F-19).
 *
 * Verifies:
 *   1. Purchase and reconciliation for Account A.
 *   2. Fresh session for the same Halaa account synchronizes entitlements.
 *   3. Negative test: Account B cannot reconcile or access Account A's purchase/entitlements.
 *   4. Consumable add-ons and event entitlements are account-bound and do not restore across accounts.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const addonsService = require("../src/modules/addons/addons.service");
const reconcileController = require("../src/modules/payments/revenuecat.reconcile.controller");
const Subscription = require("../models/SubscriptionModel");
const EventEntitlement = require("../models/EventEntitlementModel");
const Addon = require("../models/AddonModel");
const Plan = require("../models/PlanModel");
const User = require("../models/UserModel");

let userA;
let userB;

const callReconcileExact = (user, body) =>
  new Promise((resolve, reject) => {
    const res = { statusCode: 200, payload: null };
    res.status = (c) => {
      res.statusCode = c;
      return res;
    };
    res.json = (b) => {
      res.payload = b;
      resolve(res);
      return res;
    };
    const req = { user, body };
    reconcileController.reconcileExact(req, res, (err) => (err ? reject(err) : resolve(res)));
  });

test.before(async () => {
  await db.start();
});

test.after(async () => {
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();

  userA = await User.create({
    name: "User Alpha",
    email: "alpha@example.com",
    phone: "+966500000001",
    password: "password123",
    role: "host",
    accountType: "personal",
    billingUserId: "billing-user-alpha",
  });

  userB = await User.create({
    name: "User Beta",
    email: "beta@example.com",
    phone: "+966500000002",
    password: "password123",
    role: "host",
    accountType: "personal",
    billingUserId: "billing-user-beta",
  });
});

test("F-19: Account A purchase reconciles to active and synchronizes across fresh sessions", async () => {
  const plan = await Plan.getOrCreateByCode("basic_monthly_25");
  const sub = await Subscription.create({
    userId: userA._id,
    planId: plan._id,
    status: "active",
    provider: "revenuecat",
    invitePool: 50,
    compensationPool: 0,
    invitesConsumed: 0,
    storeOriginalTransactionId: "txn-alpha-sub-001",
    storeTransactionId: "txn-alpha-sub-001",
    storeProductId: "com.halaa.basic_monthly_25",
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });

  // Session 1: Reconcile exact purchase for User A
  const res1 = await callReconcileExact(userA, {
    catalogCode: "basic_monthly_25",
    transactionId: "txn-alpha-sub-001",
    storeProductId: "com.halaa.basic_monthly_25",
  });

  assert.equal(res1.statusCode, 200);
  assert.equal(res1.payload?.data?.state, "active");
  assert.equal(res1.payload?.data?.reason, "active");
  assert.equal(String(res1.payload?.data?.ids?.subscriptionId), String(sub._id));

  // Session 2: Fresh session for the same account (User A refetched/reloaded)
  const freshSessionUserA = await User.findById(userA._id);
  const res2 = await callReconcileExact(freshSessionUserA, {
    catalogCode: "basic_monthly_25",
    transactionId: "txn-alpha-sub-001",
    storeProductId: "com.halaa.basic_monthly_25",
  });

  assert.equal(res2.statusCode, 200);
  assert.equal(res2.payload?.data?.state, "active");
  assert.equal(String(res2.payload?.data?.ids?.subscriptionId), String(sub._id));
});

test("F-19: Cross-account isolation — Account B cannot access Account A subscription", async () => {
  const plan = await Plan.getOrCreateByCode("basic_monthly_25");
  await Subscription.create({
    userId: userA._id,
    planId: plan._id,
    status: "active",
    provider: "revenuecat",
    invitePool: 50,
    compensationPool: 0,
    invitesConsumed: 0,
    storeOriginalTransactionId: "txn-alpha-isolated",
    storeTransactionId: "txn-alpha-isolated",
    storeProductId: "com.halaa.basic_monthly_25",
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });

  // Account B attempts to reconcile Account A's subscription transaction
  const resB = await callReconcileExact(userB, {
    catalogCode: "basic_monthly_25",
    transactionId: "txn-alpha-isolated",
    storeProductId: "com.halaa.basic_monthly_25",
  });

  assert.equal(resB.statusCode, 200);
  // Account B does not receive User A's subscription
  assert.notEqual(resB.payload?.data?.state, "active");
  assert.equal(resB.payload?.data?.ids?.subscriptionId || null, null);
});

test("F-19: Consumable add-on ownership guard — Account B reconcile returns not_owner", async () => {
  const plan = await Plan.getOrCreateByCode("basic_monthly_50");
  await Subscription.create({
    userId: userA._id,
    planId: plan._id,
    status: "active",
    provider: "revenuecat",
    invitePool: 100,
    compensationPool: 0,
    invitesConsumed: 0,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });

  // Grant consumable add-on to User A
  const addon = await addonsService.grantAddonFromStore({
    userId: userA._id,
    addonType: "extra_invites",
    quantity: 50,
    catalogCode: "extra_invites_50",
    providerTransactionId: "txn-addon-alpha-50",
  });

  assert.equal(addon.status, "active");
  assert.equal(String(addon.userId), String(userA._id));

  // User A reconciles successfully
  const resA = await callReconcileExact(userA, {
    catalogCode: "extra_invites_50",
    transactionId: "txn-addon-alpha-50",
  });
  assert.equal(resA.payload?.data?.state, "fulfilled");
  assert.equal(String(resA.payload?.data?.ids?.addonId), String(addon._id));

  // User B attempts to claim/reconcile User A's transaction — rejected with not_owner
  const resB = await callReconcileExact(userB, {
    catalogCode: "extra_invites_50",
    transactionId: "txn-addon-alpha-50",
  });
  assert.equal(resB.statusCode, 200);
  assert.equal(resB.payload?.data?.state, "failed");
  assert.equal(resB.payload?.data?.reason, "not_owner");
  assert.equal(resB.payload?.data?.ids?.addonId || null, null);
});

test("F-19: Event consumable entitlement ownership guard — Account B reconcile returns not_owner", async () => {
  // Create an event consumable entitlement owned by User A
  const eventEnt = await EventEntitlement.create({
    userId: userA._id,
    planCode: "basic_event_100",
    source: "revenuecat",
    providerTransactionId: "txn-event-alpha-100",
    storeProductId: "com.halaa.basic_event_100",
    status: "unused",
    resolution: "fulfilled",
  });

  // User A reconciles successfully
  const resA = await callReconcileExact(userA, {
    catalogCode: "basic_event_100",
    transactionId: "txn-event-alpha-100",
    storeProductId: "com.halaa.basic_event_100",
  });
  assert.equal(resA.payload?.data?.state, "fulfilled");
  assert.equal(String(resA.payload?.data?.ids?.eventEntitlementId), String(eventEnt._id));

  // User B attempts to reconcile User A's transaction
  const resB = await callReconcileExact(userB, {
    catalogCode: "basic_event_100",
    transactionId: "txn-event-alpha-100",
    storeProductId: "com.halaa.basic_event_100",
  });
  assert.equal(resB.statusCode, 200);
  assert.equal(resB.payload?.data?.state, "failed");
  assert.equal(resB.payload?.data?.reason, "not_owner");
  assert.equal(resB.payload?.data?.ids?.eventEntitlementId || null, null);
});

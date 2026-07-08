/**
 * Exact reconciliation state derivation + eligibility (pure, DB-free).
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { deriveExactState, STATES } = require("../src/modules/payments/revenuecat.reconcileExact");
const { checkEligible } = require("../src/modules/payments/revenuecat.eligibility");

const SUB = { kind: "subscription", catalogType: "plan" };
const EVENT = { kind: "event_consumable", catalogType: "plan" };
const ADDON = { kind: "addon_consumable", catalogType: "addon" };

// ── deriveExactState ─────────────────────────────────────────────────────────
test("unknown catalog code → failed", () => {
  assert.equal(deriveExactState(null).state, STATES.FAILED);
});

test("subscription active → active; expired → superseded; refunded reason → refunded", () => {
  assert.equal(deriveExactState(SUB, { subscription: { status: "active" } }).state, STATES.ACTIVE);
  assert.equal(deriveExactState(SUB, { subscription: { status: "expired" } }).state, STATES.SUPERSEDED);
  assert.equal(deriveExactState(SUB, { subscription: { status: "expired", cancelReason: "Store refund" } }).state, STATES.REFUNDED);
});

test("subscription not yet present → pending; dead-lettered event → failed; manual_review → manual_review", () => {
  assert.equal(deriveExactState(SUB, {}).state, STATES.PENDING);
  assert.equal(deriveExactState(SUB, { event: { status: "dead_letter", reason: "unmapped_product" } }).state, STATES.FAILED);
  assert.equal(deriveExactState(SUB, { event: { status: "manual_review" } }).state, STATES.MANUAL_REVIEW);
});

test("event entitlement states map deterministically", () => {
  assert.equal(deriveExactState(EVENT, { eventEntitlement: { status: "unused", resolution: "fulfilled" } }).state, STATES.FULFILLED);
  assert.equal(deriveExactState(EVENT, { eventEntitlement: { status: "consumed" } }).state, STATES.CONSUMED);
  assert.equal(deriveExactState(EVENT, { eventEntitlement: { status: "refunded" } }).state, STATES.REFUNDED);
  assert.equal(deriveExactState(EVENT, { eventEntitlement: { status: "unused", resolution: "manual_review" } }).state, STATES.MANUAL_REVIEW);
  assert.equal(deriveExactState(EVENT, { eventEntitlement: { status: "unused", resolution: "refund_required" } }).state, STATES.REFUND_REQUIRED);
  assert.equal(deriveExactState(EVENT, {}).state, STATES.PENDING);
});

test("add-on states map deterministically", () => {
  assert.equal(deriveExactState(ADDON, { addon: { status: "active", refundState: "none" } }).state, STATES.FULFILLED);
  assert.equal(deriveExactState(ADDON, { addon: { status: "failed_quota", refundState: "refund_required" } }).state, STATES.REFUND_REQUIRED);
  assert.equal(deriveExactState(ADDON, { addon: { status: "paid", refundState: "none" } }).state, STATES.PENDING);
  assert.equal(deriveExactState(ADDON, { addon: { status: "active", refundState: "refunded" } }).state, STATES.REFUNDED);
  assert.equal(deriveExactState(ADDON, { addon: { status: "pending_provisioning", refundState: "manual_review" } }).state, STATES.MANUAL_REVIEW);
  assert.equal(deriveExactState(ADDON, {}).state, STATES.PENDING);
});

test("never reports success from unrelated access — only the exact item counts (P0-02)", () => {
  // A user with a real active subscription, but the EXACT event package attempted
  // isn't present yet → pending, not active/fulfilled.
  assert.equal(deriveExactState(EVENT, { subscription: { status: "active" } }).state, STATES.PENDING);
});

// ── eligibility ──────────────────────────────────────────────────────────────
const personalPlan = { eligibleRoles: ["host"], eligibleAccountTypes: ["personal"] };
const businessPlan = { eligibleRoles: ["host"], eligibleAccountTypes: ["business"] };
const bothAddon = { eligibleRoles: ["host"], eligibleAccountTypes: ["personal", "business"] };

test("personal host may buy personal plans, not business plans", () => {
  assert.equal(checkEligible({ role: "host", accountType: "personal" }, personalPlan).ok, true);
  assert.equal(checkEligible({ role: "host", accountType: "personal" }, businessPlan).ok, false);
});

test("business host may buy business plans, not personal plans", () => {
  assert.equal(checkEligible({ role: "host", accountType: "business" }, businessPlan).ok, true);
  assert.equal(checkEligible({ role: "host", accountType: "business" }, personalPlan).ok, false);
});

test("vendor/guest/moderator/admin may never receive host store products", () => {
  for (const role of ["vendor", "guest", "moderator", "admin", "super_admin"]) {
    assert.equal(checkEligible({ role, accountType: "personal" }, personalPlan).ok, false, role);
  }
});

test("cross-audience add-on is allowed for both host account types", () => {
  assert.equal(checkEligible({ role: "host", accountType: "personal" }, bothAddon).ok, true);
  assert.equal(checkEligible({ role: "host", accountType: "business" }, bothAddon).ok, true);
});

test("host with null accountType defaults to personal", () => {
  assert.equal(checkEligible({ role: "host", accountType: null }, personalPlan).ok, true);
  assert.equal(checkEligible({ role: "host", accountType: null }, businessPlan).ok, false);
});

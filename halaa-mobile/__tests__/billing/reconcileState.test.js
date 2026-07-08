/**
 * Exact-reconcile state → UI semantics (MOB-01 / P0-02).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  mapReconcileState,
  stateMessageKey,
  needsSupportAttention,
  isPurchaseCancelled,
} = require("../../services/billing/reconcileState");

test("success ONLY for active/fulfilled/consumed", () => {
  for (const s of ["active", "fulfilled", "consumed"]) {
    assert.equal(mapReconcileState(s).success, true, `${s} should be success`);
  }
  for (const s of ["pending", "superseded", "refund_required", "refunded", "manual_review", "failed"]) {
    assert.equal(mapReconcileState(s).success, false, `${s} must NOT be success`);
  }
});

test("pending is the only non-terminal state (keep polling)", () => {
  assert.equal(mapReconcileState("pending").terminal, false);
  for (const s of ["active", "fulfilled", "consumed", "superseded", "refund_required", "refunded", "manual_review", "failed"]) {
    assert.equal(mapReconcileState(s).terminal, true, `${s} should be terminal`);
  }
});

test("unknown state stays pending — never a false success, never hard-fail", () => {
  const m = mapReconcileState("something_new");
  assert.equal(m.success, false);
  assert.equal(m.terminal, false);
});

test("state message keys are namespaced under iapStates", () => {
  assert.equal(stateMessageKey("manual_review"), "iapStates.manual_review");
  assert.equal(stateMessageKey("active"), "iapStates.active");
});

test("manual_review and refund_required need support attention", () => {
  assert.equal(needsSupportAttention("manual_review"), true);
  assert.equal(needsSupportAttention("refund_required"), true);
  assert.equal(needsSupportAttention("active"), false);
});

test("purchase cancellation is not treated as an error", () => {
  assert.equal(isPurchaseCancelled({ userCancelled: true }), true);
  assert.equal(isPurchaseCancelled({ code: "PURCHASE_CANCELLED" }), true);
  assert.equal(isPurchaseCancelled({ message: "network error" }), false);
  assert.equal(isPurchaseCancelled(null), false);
});

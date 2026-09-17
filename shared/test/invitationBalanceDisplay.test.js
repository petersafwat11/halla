import test from "node:test";
import assert from "node:assert/strict";
import {
  canPurchaseMoreInvites,
  getInviteBreakdown,
  isEventTerminal,
  isTrialSubscription,
} from "../src/utils/invitationBalance.js";

const finite = (over = {}) => ({
  unlimited: false,
  base: 150,
  planBase: 100,
  extra: 50,
  compensation: 35,
  carried: 20,
  consumed: 40,
  total: 185,
  remaining: 145,
  ...over,
});

const activeSub = (over = {}) => ({ status: "active", planType: "basic_monthly", ...over });

test("add-more is offered on an active paid plan with a finite balance", () => {
  assert.equal(
    canPurchaseMoreInvites({ balance: finite(), subscription: activeSub(), event: { status: "live" } }),
    true
  );
});

test("add-more is hidden for unlimited balances", () => {
  assert.equal(
    canPurchaseMoreInvites({ balance: finite({ unlimited: true }), subscription: activeSub() }),
    false
  );
});

test("add-more is hidden on the free trial", () => {
  assert.equal(canPurchaseMoreInvites({ balance: finite(), subscription: { status: "trial" } }), false);
  assert.equal(
    canPurchaseMoreInvites({ balance: finite(), subscription: activeSub({ planType: "trial" }) }),
    false
  );
});

test("add-more is hidden when the subscription is no longer active", () => {
  for (const status of ["expired", "cancelled", "past_due"]) {
    assert.equal(
      canPurchaseMoreInvites({ balance: finite(), subscription: activeSub({ status }) }),
      false,
      status
    );
  }
});

test("add-more is hidden once the subscription has run past its end date", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const future = new Date(Date.now() + 86_400_000).toISOString();

  // Still `active` in the DB because no cron has swept it yet.
  assert.equal(
    canPurchaseMoreInvites({ balance: finite(), subscription: activeSub({ expiresAt: past }) }),
    false
  );
  assert.equal(
    canPurchaseMoreInvites({ balance: finite(), subscription: activeSub({ expiresAt: future }) }),
    true
  );
  // No end date (per-event plans) must not read as expired.
  assert.equal(
    canPurchaseMoreInvites({ balance: finite(), subscription: activeSub({ expiresAt: null }) }),
    true
  );
  // The backend's own verdict wins when the payload carries it.
  assert.equal(
    canPurchaseMoreInvites({ balance: finite(), subscription: activeSub({ isActive: false }) }),
    false
  );
});

test("add-more is hidden once the event reaches a terminal status", () => {
  for (const status of ["completed", "cancelled", "archived", "failed", "deleted"]) {
    assert.equal(
      canPurchaseMoreInvites({ balance: finite(), subscription: activeSub(), event: { status } }),
      false,
      status
    );
  }
  assert.equal(
    canPurchaseMoreInvites({ balance: finite(), subscription: activeSub(), event: { status: "scheduled" } }),
    true
  );
});

test("add-more is hidden on a per-event plan that already started sending", () => {
  const spent = activeSub({ isSingleEvent: true, firstSendAt: "2026-09-01T00:00:00.000Z" });
  assert.equal(canPurchaseMoreInvites({ balance: finite(), subscription: spent }), false);

  const unspent = activeSub({ isSingleEvent: true, firstSendAt: null });
  assert.equal(canPurchaseMoreInvites({ balance: finite(), subscription: unspent }), true);
});

test("isTrialSubscription and isEventTerminal accept the shapes the APIs return", () => {
  assert.equal(isTrialSubscription({ planId: { planType: "trial" } }), true);
  assert.equal(isTrialSubscription({ planCode: "trial" }), true);
  assert.equal(isTrialSubscription(null), false);
  assert.equal(isEventTerminal("completed"), true);
  assert.equal(isEventTerminal({ status: "live" }), false);
  assert.equal(isEventTerminal(undefined), false);
});

test("breakdown rows are additive and drop empty optional rows", () => {
  const rows = getInviteBreakdown(finite());
  assert.deepEqual(rows, [
    { key: "planInvites", value: 100 },
    { key: "extraInvites", value: 50 },
    { key: "compensationInvites", value: 15 },
    { key: "carriedInvites", value: 20 },
  ]);
  const sum = rows.reduce((total, row) => total + row.value, 0);
  assert.equal(sum, finite().total);

  const plain = getInviteBreakdown({
    unlimited: false,
    base: 100,
    planBase: 100,
    extra: 0,
    compensation: 15,
    carried: 0,
    consumed: 0,
    total: 115,
    remaining: 115,
  });
  assert.deepEqual(plain, [
    { key: "planInvites", value: 100 },
    { key: "compensationInvites", value: 15 },
  ]);
});

test("breakdown is empty for unlimited balances", () => {
  assert.deepEqual(getInviteBreakdown({ unlimited: true }), []);
  assert.deepEqual(getInviteBreakdown(null), []);
});

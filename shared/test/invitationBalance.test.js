import test from "node:test";
import assert from "node:assert/strict";
import {
  invitationBalanceSchema,
  calculateInvitationBalance,
} from "../src/schemas/invitationBalance.js";

test("calculateInvitationBalance: base + compensation - consumed calculation", () => {
  const sub = {
    invitePool: 100,
    compensationPool: 15,
    invitesConsumed: 30,
    planType: "basic_event",
    planCode: "basic_event_100",
  };

  const balance = calculateInvitationBalance(sub);
  assert.equal(balance.unlimited, false);
  assert.equal(balance.base, 100);
  assert.equal(balance.compensation, 15);
  assert.equal(balance.consumed, 30);
  assert.equal(balance.total, 115);
  assert.equal(balance.remaining, 85);

  // Validate against Zod schema
  assert.doesNotThrow(() => invitationBalanceSchema.parse(balance));
});

test("calculateInvitationBalance: derives 15% compensation when compensationPool is missing", () => {
  const sub = {
    invitePool: 200,
    invitesConsumed: 50,
  };

  const balance = calculateInvitationBalance(sub);
  assert.equal(balance.unlimited, false);
  assert.equal(balance.base, 200);
  assert.equal(balance.compensation, 30); // floor(200 * 0.15) = 30
  assert.equal(balance.total, 230);
  assert.equal(balance.consumed, 50);
  assert.equal(balance.remaining, 180);

  assert.doesNotThrow(() => invitationBalanceSchema.parse(balance));
});

test("calculateInvitationBalance: clamps remaining at zero when consumed exceeds total", () => {
  const sub = {
    invitePool: 50,
    compensationPool: 7,
    invitesConsumed: 70,
  };

  const balance = calculateInvitationBalance(sub);
  assert.equal(balance.unlimited, false);
  assert.equal(balance.base, 50);
  assert.equal(balance.compensation, 7);
  assert.equal(balance.total, 57);
  assert.equal(balance.consumed, 70);
  assert.equal(balance.remaining, 0);

  assert.doesNotThrow(() => invitationBalanceSchema.parse(balance));
});

test("calculateInvitationBalance: unlimited plan via planType/planCode/limits", () => {
  const unlimited1 = {
    planCode: "unlimited",
    invitesConsumed: 450,
  };
  const b1 = calculateInvitationBalance(unlimited1);
  assert.deepEqual(b1, {
    unlimited: true,
    base: null,
    compensation: null,
    consumed: 450,
    total: null,
    remaining: null,
  });
  assert.doesNotThrow(() => invitationBalanceSchema.parse(b1));

  const unlimited2 = {
    planType: "unlimited",
    invitePool: null,
    invitesConsumed: 0,
  };
  const b2 = calculateInvitationBalance(unlimited2);
  assert.equal(b2.unlimited, true);
  assert.equal(b2.base, null);
  assert.equal(b2.remaining, null);
  assert.doesNotThrow(() => invitationBalanceSchema.parse(b2));

  const unlimited3 = {
    invitePool: -1,
    invitesConsumed: 25,
  };
  const b3 = calculateInvitationBalance(unlimited3);
  assert.equal(b3.unlimited, true);
  assert.equal(b3.consumed, 25);
  assert.doesNotThrow(() => invitationBalanceSchema.parse(b3));
});

test("calculateInvitationBalance: orphaned or null target fails closed to 0", () => {
  const bNull = calculateInvitationBalance(null);
  assert.deepEqual(bNull, {
    unlimited: false,
    base: 0,
    compensation: 0,
    consumed: 0,
    total: 0,
    remaining: 0,
  });
  assert.doesNotThrow(() => invitationBalanceSchema.parse(bNull));

  const bEmpty = calculateInvitationBalance({});
  assert.deepEqual(bEmpty, {
    unlimited: false,
    base: 0,
    compensation: 0,
    consumed: 0,
    total: 0,
    remaining: 0,
  });
  assert.doesNotThrow(() => invitationBalanceSchema.parse(bEmpty));
});

test("calculateInvitationBalance: accepts direct canonical balance object", () => {
  const direct = {
    unlimited: false,
    base: 50,
    compensation: 7,
    consumed: 12,
    total: 57,
    remaining: 45,
  };

  const b = calculateInvitationBalance(direct);
  assert.deepEqual(b, direct);
  assert.doesNotThrow(() => invitationBalanceSchema.parse(b));
});

import test from "node:test";
import assert from "node:assert/strict";
import { invitationBalanceSchema, parseInvitationBalance } from "../src/schemas/invitationBalance.js";

test("canonical finite invitation balance validates without client-side arithmetic", () => {
  const value = { unlimited: false, base: 100, compensation: 15, consumed: 30, total: 115, remaining: 85 };
  assert.deepEqual(parseInvitationBalance(value), value);
});

test("canonical unlimited invitation balance uses null finite fields", () => {
  const value = { unlimited: true, base: null, compensation: null, consumed: 30, total: null, remaining: null };
  assert.deepEqual(parseInvitationBalance(value), value);
});

test("invitation balance rejects mixed or incomplete semantics", () => {
  assert.equal(invitationBalanceSchema.safeParse({
    unlimited: true, base: 100, compensation: null, consumed: 0, total: null, remaining: null,
  }).success, false);
  assert.equal(invitationBalanceSchema.safeParse({
    unlimited: false, base: 100, compensation: 15, consumed: 0, total: null, remaining: 115,
  }).success, false);
});

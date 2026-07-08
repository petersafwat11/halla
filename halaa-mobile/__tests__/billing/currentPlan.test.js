/**
 * Current-plan identity by EXACT code (DEC-02 / MOB-04 / P0-12).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { isCurrentPlan, subscriptionCode } = require("../../services/billing/currentPlan");

test("subscriptionCode reads code shapes but NEVER planType", () => {
  assert.equal(subscriptionCode({ planCode: "basic_monthly_25" }), "basic_monthly_25");
  assert.equal(subscriptionCode({ planId: { code: "premium_monthly_100" } }), "premium_monthly_100");
  assert.equal(subscriptionCode({ code: "business_annual" }), "business_annual");
  assert.equal(subscriptionCode({ planType: "basic_monthly" }), null);
  assert.equal(subscriptionCode(null), null);
});

test("same planType, different tier are NOT both current (the P0-12 bug)", () => {
  const sub = { planCode: "business_event_50", planType: "business_event" };
  const tier50 = { internalCode: "business_event_50", currentPlanIdentityKey: "business_event_50" };
  const tier100 = { internalCode: "business_event_100", currentPlanIdentityKey: "business_event_100" };
  assert.equal(isCurrentPlan(sub, tier50), true);
  assert.equal(isCurrentPlan(sub, tier100), false);
});

test("works with raw plan objects that carry .code", () => {
  assert.equal(isCurrentPlan({ planCode: "basic_monthly_25" }, { code: "basic_monthly_25" }), true);
  assert.equal(isCurrentPlan({ planCode: "basic_monthly_25" }, { code: "basic_monthly_50" }), false);
});

test("no subscription or no entry => not current", () => {
  assert.equal(isCurrentPlan(null, { code: "x" }), false);
  assert.equal(isCurrentPlan({ planCode: "x" }, null), false);
});

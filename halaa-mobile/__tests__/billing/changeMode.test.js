/**
 * Subscription change classification + Google replacement mode (MOB-02).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { classifyChange, selectReplacementMode } = require("../../services/billing/changeMode");
const { REPLACEMENT_MODE } = require("../../services/billing/constants");

const monthly25 = { internalCode: "basic_monthly_25", kind: "subscription", billingPeriod: "monthly", tier: 25 };
const monthly100 = { internalCode: "basic_monthly_100", kind: "subscription", billingPeriod: "monthly", tier: 100 };
const quarterly = { internalCode: "business_quarterly", kind: "subscription", billingPeriod: "quarterly", tier: 0 };
const annual = { internalCode: "business_annual", kind: "subscription", billingPeriod: "annual", tier: 0 };
const event = { internalCode: "basic_event_25", kind: "event_consumable", billingPeriod: "one_time", tier: 25 };

test("no current subscription => new (fresh purchase)", () => {
  assert.equal(classifyChange(null, monthly25), "new");
  assert.equal(selectReplacementMode("new"), null);
});

test("higher invite tier, same period => upgrade => CHARGE_PRORATED_PRICE", () => {
  assert.equal(classifyChange(monthly25, monthly100), "upgrade");
  assert.equal(selectReplacementMode("upgrade"), REPLACEMENT_MODE.CHARGE_PRORATED_PRICE);
});

test("lower invite tier => downgrade => DEFERRED (effective next renewal)", () => {
  assert.equal(classifyChange(monthly100, monthly25), "downgrade");
  assert.equal(selectReplacementMode("downgrade"), REPLACEMENT_MODE.DEFERRED);
});

test("annual outranks quarterly (period dominates tier)", () => {
  assert.equal(classifyChange(quarterly, annual), "upgrade");
  assert.equal(classifyChange(annual, quarterly), "downgrade");
});

test("same exact code => crossgrade => WITH_TIME_PRORATION", () => {
  assert.equal(classifyChange(monthly25, monthly25), "crossgrade");
  assert.equal(selectReplacementMode("crossgrade"), REPLACEMENT_MODE.WITH_TIME_PRORATION);
});

test("consumable target => new, never a subscription replacement", () => {
  assert.equal(classifyChange(monthly25, event), "new");
  assert.equal(classifyChange(event, monthly25), "new");
});

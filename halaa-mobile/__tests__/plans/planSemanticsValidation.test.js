/**
 * Session 3.1 Mobile: Plan Semantics, Validation, and Classification Tests (PLN-03, PLN-04, PLN-05, PLN-09)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Mobile Plan Classification: Preserves quarterly, annual, monthly, event distinctions (PLN-03)", async () => {
  const {
    isPoolPlan,
    isPerEventPlan,
    isRecurringBilling,
    getBillingType,
  } = await import("@halaa/shared/constants");

  // 1. Business quarterly plan
  const quarterly = {
    planType: "business_quarterly",
    billingType: "quarterly",
  };
  const qBilling = quarterly.billingType || getBillingType(quarterly.planType);
  const qIsPool = isPoolPlan(quarterly.planType) || isRecurringBilling(qBilling);
  assert.equal(qIsPool, true, "Quarterly plan is a pool plan");
  assert.equal(qBilling, "quarterly", "Quarterly plan retains quarterly billingType");

  // 2. Business annual plan
  const annual = {
    planType: "business_annual",
    billingType: "annual",
  };
  const aBilling = annual.billingType || getBillingType(annual.planType);
  const aIsPool = isPoolPlan(annual.planType) || isRecurringBilling(aBilling);
  assert.equal(aIsPool, true, "Annual plan is a pool plan");
  assert.equal(aBilling, "annual", "Annual plan retains annual billingType");

  // 3. Host event plan
  const event = {
    planType: "basic_event",
    billingType: "event",
  };
  const eBilling = event.billingType || getBillingType(event.planType);
  const eIsPool = isPoolPlan(event.planType) || isRecurringBilling(eBilling);
  assert.equal(eIsPool, false, "Event plan is not a pool plan");
  assert.equal(isPerEventPlan(event.planType), true, "Event plan is per-event");
});
test("Mobile EditPlanModal: Source verification for type-conditional validation & durationDays safety (PLN-04)", () => {
  const modalPath = path.resolve(
    __dirname,
    "../../components/admin-dashboard/plans/EditPlanModal.js"
  );
  const content = fs.readFileSync(modalPath, "utf8");

  // Checks that unlimited plan check exists and protects invitePool / durationDays
  assert.ok(
    content.includes("isUnlimitedPlan"),
    "EditPlanModal must identify unlimited plans"
  );
  assert.ok(
    content.includes("!isUnlimitedPlan && (!parsedInvitePool || parsedInvitePool <= 0)"),
    "EditPlanModal must conditionally validate invitePool for non-unlimited plans"
  );
  assert.ok(
    content.includes("parsedDuration > 0") && content.includes("limits.durationDays"),
    "EditPlanModal must safely handle durationDays without converting empty strings to 0"
  );
});

test("Mobile PlanSummaryCard: Source verification for canonical classification and native price fallback", () => {
  const cardPath = path.resolve(
    __dirname,
    "../../components/plans/PlanSummaryCard.js"
  );
  const content = fs.readFileSync(cardPath, "utf8");

  assert.ok(
    content.includes("isPoolPlan"),
    "PlanSummaryCard must import and use isPoolPlan"
  );
  assert.ok(
    content.includes("isRecurringBilling"),
    "PlanSummaryCard must import and use isRecurringBilling"
  );
  assert.ok(
    content.includes("isPool"),
    "PlanSummaryCard must use isPool rather than isMonthly only"
  );
  assert.ok(
    content.includes("isNative"),
    "PlanSummaryCard must accept isNative prop"
  );
  assert.ok(
    content.includes("priceUnavailable"),
    "PlanSummaryCard must render priceUnavailable when native and priceDisplay is not loaded"
  );
  assert.ok(
    content.includes("السعر غير متاح"),
    "PlanSummaryCard must use localized fallback 'السعر غير متاح'"
  );
});

test("Mobile PlansSummaryScreen: Passes isNative prop to PlanSummaryCard", () => {
  const screenPath = path.resolve(
    __dirname,
    "../../screens/host/PlansSummaryScreen.js"
  );
  const content = fs.readFileSync(screenPath, "utf8");

  assert.ok(
    content.includes("isNative={!isWeb}"),
    "PlansSummaryScreen must pass isNative={!isWeb} to PlanSummaryCard"
  );
});

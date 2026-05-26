/**
 * Plan helpers — mirror backend `shared/constants/plans.js`.
 *
 * A plan with planType ending in `_quarterly` / `_annual` (or the legacy
 * `business_quarterly` / `business_annual` codes) shares an invite pool
 * across unlimited events. A plan with planType ending in `_event` is
 * single-event with `limits.maxInvitesPerEvent`.
 */

const POOL_PLAN_TYPES = new Set([
  "basic_monthly",
  "premium_monthly",
  "business_quarterly",
  "business_annual",
]);

export const isPoolPlan = (planType) => POOL_PLAN_TYPES.has(planType);

export const isPerEventPlan = (planType) =>
  typeof planType === "string" && planType.endsWith("_event");

const BILLING_CYCLE_SUFFIXES = ["_monthly", "_quarterly", "_annual"];

export const planHasBillingCycle = (planType) =>
  typeof planType === "string" &&
  BILLING_CYCLE_SUFFIXES.some((suffix) => planType.endsWith(suffix));

/**
 * Compensation is universal across all plans — 15% of the selected invite
 * tier (event plans) or the invite pool (pool plans). Computed at render
 * time via this constant in `<PlanDescription>` and `PlanSummaryCard`.
 */
export const COMPENSATION_PERCENTAGE = 15;

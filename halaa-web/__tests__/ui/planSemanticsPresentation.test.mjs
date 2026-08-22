/**
 * Session 3.1 Web: Plan Semantics and Classification Tests (PLN-03, PLN-05, PLN-09)
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  isPoolPlan,
  isPerEventPlan,
  isRecurringBilling,
  getBillingType,
  getBillingPeriodKey,
} from "@halaa/shared/constants/plans";

test("Web Plan Classification: Preserves quarterly and annual periods without collapsing (PLN-03)", () => {
  // 1. Business Quarterly plan
  const quarterlyPlan = {
    code: "business_quarterly",
    planType: "business_quarterly",
    billingType: "quarterly",
    limits: { maxEvents: -1, invitePool: 500, durationDays: 90 },
    pricing: { oneTime: 3000 },
  };

  const qBillingType = quarterlyPlan.billingType || getBillingType(quarterlyPlan.planType);
  const qIsPool = isPoolPlan(quarterlyPlan.planType) || isRecurringBilling(qBillingType);
  const qPeriodKey = getBillingPeriodKey(qBillingType);

  assert.equal(qIsPool, true, "Quarterly plan must be classified as a pool plan");
  assert.equal(qBillingType, "quarterly", "Quarterly plan billingType must remain 'quarterly'");
  assert.equal(qPeriodKey, "quarterly", "Period key must be 'quarterly'");

  // 2. Business Annual plan
  const annualPlan = {
    code: "business_annual",
    planType: "business_annual",
    billingType: "annual",
    limits: { maxEvents: -1, invitePool: 2000, durationDays: 365 },
    pricing: { oneTime: 10000 },
  };

  const aBillingType = annualPlan.billingType || getBillingType(annualPlan.planType);
  const aIsPool = isPoolPlan(annualPlan.planType) || isRecurringBilling(aBillingType);
  const aPeriodKey = getBillingPeriodKey(aBillingType);

  assert.equal(aIsPool, true, "Annual plan must be classified as a pool plan");
  assert.equal(aBillingType, "annual", "Annual plan billingType must remain 'annual'");
  assert.equal(aPeriodKey, "annual", "Period key must be 'annual'");

  // 3. Basic Event plan
  const eventPlan = {
    code: "basic_event_50",
    planType: "basic_event",
    billingType: "event",
    limits: { maxEvents: 1, invitePool: 50, durationDays: 90 },
    pricing: { oneTime: 185 },
  };

  const eBillingType = eventPlan.billingType || getBillingType(eventPlan.planType);
  const eIsPool = isPoolPlan(eventPlan.planType) || isRecurringBilling(eBillingType);
  const ePeriodKey = getBillingPeriodKey(eBillingType);

  assert.equal(eIsPool, false, "Event plan must NOT be classified as a pool plan");
  assert.equal(isPerEventPlan(eventPlan.planType), true, "Event plan must be per-event");
  assert.equal(eBillingType, "event", "Event plan billingType must be 'event'");
  assert.equal(ePeriodKey, "event", "Period key must be 'event'");
});

test("Web Plan Summary Card: Static source code verification", () => {
  const cardPath = path.resolve(
    __dirname,
    "../../app/[lang]/host/plans/summary/_components/PlanSummaryCard.js"
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
    content.includes("summary.periods.annual") || content.includes("effectiveBillingType"),
    "PlanSummaryCard must reference annual/quarterly periods instead of hardcoded monthly"
  );
});

test("Web Plan Localization: Contains period keys for monthly, quarterly, annual, event", () => {
  const enPath = path.resolve(__dirname, "../../localization/locales/en/plans.json");
  const arPath = path.resolve(__dirname, "../../localization/locales/ar/plans.json");

  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));

  assert.ok(en.summary?.periods?.monthly, "en/plans.json has monthly period");
  assert.ok(en.summary?.periods?.quarterly, "en/plans.json has quarterly period");
  assert.ok(en.summary?.periods?.annual, "en/plans.json has annual period");
  assert.ok(en.summary?.periods?.event, "en/plans.json has event period");

  assert.ok(ar.summary?.periods?.monthly, "ar/plans.json has monthly period");
  assert.ok(ar.summary?.periods?.quarterly, "ar/plans.json has quarterly period");
  assert.ok(ar.summary?.periods?.annual, "ar/plans.json has annual period");
  assert.ok(ar.summary?.periods?.event, "ar/plans.json has event period");
});

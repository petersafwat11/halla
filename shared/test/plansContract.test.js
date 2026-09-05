/**
 * Session 3.1: Canonical Plan Semantics and Invite Pool Contract Tests
 * Issues: PLN-03, PLN-04, PLN-05, PLN-09
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PLAN_TYPES,
  PLAN_FAMILIES,
  BILLING_TYPES,
  PLAN_AVAILABILITY as _PLAN_AVAILABILITY,
  COMPENSATION_PERCENTAGE as _COMPENSATION_PERCENTAGE,
  isUnlimited as _isUnlimited,
  isTrialPlan,
  isPerEventPlan,
  isPoolPlan,
  isManagedPlan,
  isRecurringBilling,
  isRecurringPlan,
  getPlanFamily,
  getBillingType,
  getBillingPeriodKey,
} from "../src/constants/plans.js";

import {
  createPlanSchema,
  editPlanSchema,
} from "../src/schemas/plans.js";

import { toSubscriptionDTO } from "../src/utils/adapters.js";

// Table-driven plan-type matrix defining authoritative semantics for each type
const PLAN_MATRIX = [
  {
    planType: PLAN_TYPES.TRIAL,
    family: null,
    billingType: BILLING_TYPES.EVENT,
    isPool: false,
    isPerEvent: true,
    isTrial: true,
    isManaged: false,
    isRecurring: false,
    periodKey: "event",
    defaultCapacity: 5,
  },
  {
    planType: PLAN_TYPES.BASIC_EVENT,
    family: PLAN_FAMILIES.BASIC,
    billingType: BILLING_TYPES.EVENT,
    isPool: false,
    isPerEvent: true,
    isTrial: false,
    isManaged: false,
    isRecurring: false,
    periodKey: "event",
    defaultCapacity: 50,
  },
  {
    planType: PLAN_TYPES.BASIC_MONTHLY,
    family: PLAN_FAMILIES.BASIC,
    billingType: BILLING_TYPES.MONTHLY,
    isPool: true,
    isPerEvent: false,
    isTrial: false,
    isManaged: false,
    isRecurring: true,
    periodKey: "monthly",
    defaultCapacity: 50,
  },
  {
    planType: PLAN_TYPES.PREMIUM_EVENT,
    family: PLAN_FAMILIES.PREMIUM,
    billingType: BILLING_TYPES.EVENT,
    isPool: false,
    isPerEvent: true,
    isTrial: false,
    isManaged: true,
    isRecurring: false,
    periodKey: "event",
    defaultCapacity: 100,
  },
  {
    planType: PLAN_TYPES.PREMIUM_MONTHLY,
    family: PLAN_FAMILIES.PREMIUM,
    billingType: BILLING_TYPES.MONTHLY,
    isPool: true,
    isPerEvent: false,
    isTrial: false,
    isManaged: true,
    isRecurring: true,
    periodKey: "monthly",
    defaultCapacity: 100,
  },
  {
    planType: PLAN_TYPES.BUSINESS_EVENT,
    family: PLAN_FAMILIES.BUSINESS,
    billingType: BILLING_TYPES.EVENT,
    isPool: false,
    isPerEvent: true,
    isTrial: false,
    isManaged: true,
    isRecurring: false,
    periodKey: "event",
    defaultCapacity: 100,
  },
  {
    planType: PLAN_TYPES.BUSINESS_QUARTERLY,
    family: PLAN_FAMILIES.BUSINESS,
    billingType: BILLING_TYPES.QUARTERLY,
    isPool: true,
    isPerEvent: false,
    isTrial: false,
    isManaged: true,
    isRecurring: true,
    periodKey: "quarterly",
    defaultCapacity: 500,
  },
  {
    planType: PLAN_TYPES.BUSINESS_ANNUAL,
    family: PLAN_FAMILIES.BUSINESS,
    billingType: BILLING_TYPES.ANNUAL,
    isPool: true,
    isPerEvent: false,
    isTrial: false,
    isManaged: true,
    isRecurring: true,
    periodKey: "annual",
    defaultCapacity: 2000,
  },
  {
    planType: PLAN_TYPES.UNLIMITED,
    family: null,
    billingType: null,
    isPool: true,
    isPerEvent: false,
    isTrial: false,
    isManaged: false,
    isRecurring: false,
    periodKey: "event",
    defaultCapacity: null,
  },
];

test("Plan Matrix: Every plan type classifies with canonical semantics (PLN-03, PLN-05)", () => {
  for (const item of PLAN_MATRIX) {
    assert.equal(
      isPerEventPlan(item.planType),
      item.isPerEvent,
      `isPerEventPlan('${item.planType}') must be ${item.isPerEvent}`
    );
    assert.equal(
      isPoolPlan(item.planType),
      item.isPool,
      `isPoolPlan('${item.planType}') must be ${item.isPool}`
    );
    assert.equal(
      isTrialPlan(item.planType),
      item.isTrial,
      `isTrialPlan('${item.planType}') must be ${item.isTrial}`
    );
    assert.equal(
      isManagedPlan(item.planType),
      item.isManaged,
      `isManagedPlan('${item.planType}') must be ${item.isManaged}`
    );
    assert.equal(
      getPlanFamily(item.planType),
      item.family,
      `getPlanFamily('${item.planType}') must be ${item.family}`
    );
    assert.equal(
      getBillingType(item.planType),
      item.billingType,
      `getBillingType('${item.planType}') must be ${item.billingType}`
    );
    assert.equal(
      isRecurringPlan(item.planType),
      item.isRecurring,
      `isRecurringPlan('${item.planType}') must be ${item.isRecurring}`
    );
    if (item.billingType) {
      assert.equal(
        isRecurringBilling(item.billingType),
        item.isRecurring,
        `isRecurringBilling('${item.billingType}') must match recurring status`
      );
    }
    assert.equal(
      getBillingPeriodKey(item.planType),
      item.periodKey,
      `getBillingPeriodKey('${item.planType}') must be ${item.periodKey}`
    );
  }
});

test("Plan Schemas: Create and Edit schemas support nullable durationDays and invitePool (PLN-04)", () => {
  // 1. Unlimited plan with null invitePool and null durationDays
  const unlimitedPlanData = {
    code: "unlimited_corp",
    planType: "unlimited",
    nameAr: "باقة غير محدودة",
    nameEn: "Unlimited Corp Plan",
    pricing: { oneTime: 0 },
    limits: {
      maxEvents: -1,
      invitePool: null,
      durationDays: null,
      maxHosts: null,
    },
    features: { whatsAppTemplates: 0 },
  };

  const createResult = createPlanSchema.safeParse(unlimitedPlanData);
  assert.ok(createResult.success, "Unlimited plan with null invitePool and durationDays must be valid");

  // 2. Edit plan schema accepts null durationDays and null invitePool
  const editPayload = {
    limits: {
      maxEvents: -1,
      invitePool: null,
      durationDays: null,
    },
    isActive: true,
  };
  const editResult = editPlanSchema.safeParse(editPayload);
  assert.ok(editResult.success, "Edit plan schema must accept null durationDays and null invitePool");

  // 3. Capped plan accepts positive invitePool and durationDays
  const cappedPlanData = {
    code: "basic_event_100_v2",
    planType: "basic_event",
    nameAr: "هلا اساسي 100",
    nameEn: "Halaa Basic 100",
    pricing: { oneTime: 350 },
    limits: {
      maxEvents: 1,
      invitePool: 100,
      durationDays: 90,
    },
    features: { whatsAppTemplates: 0 },
  };
  const cappedResult = createPlanSchema.safeParse(cappedPlanData);
  assert.ok(cappedResult.success, "Capped plan with positive invitePool must be valid");
});

test("toSubscriptionDTO: Authoritative invitePool, 15% compensation, and remaining calculation (PLN-09)", () => {
  // 1. Per-event subscription with invitePool = 100
  const perEventSub = {
    _id: "sub_100",
    planCode: "basic_event_100",
    planType: "basic_event",
    status: "active",
    invitePool: 100,
    compensationPool: 15,
    invitesConsumed: 30,
  };
  const dto1 = toSubscriptionDTO(perEventSub);
  assert.equal(dto1.id, "sub_100");
  assert.equal(dto1.invitePool, 100);
  assert.equal(dto1.compensationPool, 15);
  assert.equal(dto1.invitesConsumed, 30);
  assert.equal(dto1.invitationBalance.unlimited, false);
  assert.equal(dto1.invitationBalance.remaining, 85); // 100 + 15 - 30 = 85
  assert.equal(dto1.invitationBalance.total, 115);
  assert.equal(dto1.billingType, "event");
  assert.equal(dto1.billingInterval, "event");

  // 2. Pool quarterly subscription with stored compensationPool
  const quarterlySub = {
    _id: "sub_500",
    planCode: "business_quarterly",
    planType: "business_quarterly",
    status: "active",
    invitePool: 500,
    compensationPool: 75,
    invitesConsumed: 120,
  };
  const dto2 = toSubscriptionDTO(quarterlySub);
  assert.equal(dto2.invitePool, 500);
  assert.equal(dto2.compensationPool, 75);
  assert.equal(dto2.invitationBalance.unlimited, false);
  assert.equal(dto2.invitationBalance.remaining, 455); // 500 + 75 - 120 = 455
  assert.equal(dto2.invitationBalance.total, 575);
  assert.equal(dto2.billingType, "quarterly");
  assert.equal(dto2.billingInterval, "quarterly");

  // 3. Unlimited plan
  const unlimitedSub = {
    _id: "sub_unlimited",
    planCode: "unlimited",
    planType: "unlimited",
    status: "active",
    invitePool: null,
    invitesConsumed: 1000,
  };
  const dto3 = toSubscriptionDTO(unlimitedSub);
  assert.equal(dto3.invitePool, null);
  assert.equal(dto3.compensationPool, null);
  assert.equal(dto3.invitationBalance.unlimited, true);
  assert.equal(dto3.invitationBalance.remaining, null);
  assert.equal(dto3.invitationBalance.consumed, 1000);
});

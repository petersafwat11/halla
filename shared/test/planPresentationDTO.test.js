/**
 * Session 3.2: Canonical Plan Presentation DTO Tests (PLN-06, PLN-07, PLN-08)
 */

import test from "node:test";
import assert from "node:assert/strict";

import { toPlanPresentationDTO } from "../src/utils/adapters.js";
import { PLAN_TYPES, PLAN_FAMILIES, BILLING_TYPES } from "../src/constants/plans.js";

test("toPlanPresentationDTO: Normalizes business quarterly plan with setup fee and extras (PLN-08)", () => {
  const rawPlan = {
    _id: "60d5ecb8b392d3001f8d8a01",
    code: "business_quarterly",
    planType: "business_quarterly",
    nameAr: "باقة الأعمال الربع سنوية",
    nameEn: "Business Quarterly Plan",
    descriptionAr: "وصف الباقة",
    descriptionEn: "Plan description",
    pricing: { oneTime: 3000 },
    setupFeeAmount: 500,
    limits: {
      maxEvents: -1,
      invitePool: 500,
      durationDays: 90,
      maxHosts: 5,
    },
    features: {
      whatsAppTemplates: 10,
    },
    featureBullets: {
      ar: ["دعم مخصص على مدار الساعة", "تقارير متقدمة للمناسبات"],
      en: ["24/7 dedicated support", "Advanced event reports"],
    },
    isPopular: true,
    sortOrder: 1,
    isActive: true,
    isPublic: true,
  };

  const dto = toPlanPresentationDTO(rawPlan);

  assert.equal(dto.id, "60d5ecb8b392d3001f8d8a01");
  assert.equal(dto.code, "business_quarterly");
  assert.equal(dto.planType, "business_quarterly");
  assert.equal(dto.planFamily, "business");
  assert.equal(dto.billingType, "quarterly");
  assert.equal(dto.billingPeriodKey, "quarterly");

  assert.equal(dto.isPool, true);
  assert.equal(dto.isPerEvent, false);
  assert.equal(dto.isTrial, false);
  assert.equal(dto.isManaged, true);
  assert.equal(dto.isUnlimited, false);

  assert.equal(dto.pricing.oneTime, 3000);
  assert.equal(dto.pricing.setupFee, 500);

  assert.equal(dto.limits.maxEvents, -1);
  assert.equal(dto.limits.invitePool, 500);
  assert.equal(dto.limits.compensationPool, 75); // 15% of 500
  assert.equal(dto.limits.durationDays, 90);
  assert.equal(dto.limits.maxHosts, 5);

  assert.equal(dto.features.whatsAppTemplates, 10);
  assert.deepEqual(dto.featureBullets.ar, [
    "دعم مخصص على مدار الساعة",
    "تقارير متقدمة للمناسبات",
  ]);

  // Extras array contains setup_fee and whatsapp_templates
  assert.equal(dto.extras.length, 2);
  assert.deepEqual(dto.extras[0], {
    type: "setup_fee",
    amount: 500,
    isOneTime: true,
  });
  assert.deepEqual(dto.extras[1], {
    type: "whatsapp_templates",
    count: 10,
    isIncluded: true,
  });
});

test("toPlanPresentationDTO: Unlimited plan with null pool and omitted durationDays (PLN-08)", () => {
  const rawUnlimited = {
    _id: "60d5ecb8b392d3001f8d8a02",
    code: "unlimited",
    planType: "unlimited",
    nameAr: "باقة غير محدودة",
    nameEn: "Unlimited Enterprise",
    pricing: { oneTime: 0 },
    limits: {
      maxEvents: -1,
      invitePool: null,
      durationDays: null,
    },
  };

  const dto = toPlanPresentationDTO(rawUnlimited);

  assert.equal(dto.isUnlimited, true);
  assert.equal(dto.isPool, true);
  assert.equal(dto.limits.invitePool, null);
  assert.equal(dto.limits.compensationPool, 0);
  assert.equal(dto.limits.durationDays, null);
  assert.equal(dto.extras.length, 0);
});

test("toPlanPresentationDTO: Per-event basic plan with tier invites (PLN-08)", () => {
  const rawEvent = {
    _id: "60d5ecb8b392d3001f8d8a03",
    code: "basic_event_100",
    planType: "basic_event",
    nameAr: "هلا اساسي 100",
    nameEn: "Halaa Basic 100",
    price: 350,
    invites: 100,
    limits: {
      maxEvents: 1,
      invitePool: 100,
      durationDays: 90,
    },
  };

  const dto = toPlanPresentationDTO(rawEvent);

  assert.equal(dto.isPool, false);
  assert.equal(dto.isPerEvent, true);
  assert.equal(dto.planFamily, "basic");
  assert.equal(dto.billingType, "event");
  assert.equal(dto.billingPeriodKey, "event");
  assert.equal(dto.pricing.oneTime, 350);
  assert.equal(dto.limits.invitePool, 100);
  assert.equal(dto.limits.compensationPool, 15);
  assert.equal(dto.limits.durationDays, 90);
});

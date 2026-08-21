/**
 * Session 3.2 Mobile: Plan Presentation and Card Parity Tests (PLN-06, PLN-08)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Mobile Plan Presentation: toPlanPresentationDTO aligns limits and priced extras (PLN-08)", async () => {
  const { toPlanPresentationDTO } = await import("@halaa/shared/utils/adapters");

  const businessAnnual = {
    code: "business_annual",
    planType: "business_annual",
    planFamily: "business",
    pricing: { oneTime: 10000 },
    setupFeeAmount: 1500,
    features: { whatsAppTemplates: 20 },
    limits: {
      maxEvents: -1,
      invitePool: 2000,
      durationDays: 365,
    },
    featureBullets: {
      ar: ["دعم متكامل مخصص", "لوحة تحكم إدارية متقدمة"],
      en: ["Dedicated custom support", "Advanced admin dashboard"],
    },
  };

  const dto = toPlanPresentationDTO(businessAnnual);

  assert.equal(dto.code, "business_annual");
  assert.equal(dto.isPool, true);
  assert.equal(dto.pricing.oneTime, 10000);
  assert.equal(dto.pricing.setupFee, 1500);
  assert.equal(dto.limits.invitePool, 2000);
  assert.equal(dto.limits.compensationPool, 300); // 15% of 2000
  assert.equal(dto.limits.durationDays, 365);
  assert.equal(dto.extras.length, 2);
  assert.equal(dto.extras[0].type, "setup_fee");
  assert.equal(dto.extras[0].amount, 1500);
});

test("Mobile Plan Cards: Source verification for planName propagation & canonical classification (PLN-06)", () => {
  const hostCardPath = path.resolve(
    __dirname,
    "../../components/plans/HostPlanCard.js"
  );
  const hostCardContent = fs.readFileSync(hostCardPath, "utf8");

  assert.ok(
    hostCardContent.includes("planName={planName}"),
    "HostPlanCard must propagate planName to PlanPriceBlock"
  );

  const priceBlockPath = path.resolve(
    __dirname,
    "../../components/plans/_components/PlanPriceBlock.js"
  );
  const priceBlockContent = fs.readFileSync(priceBlockPath, "utf8");

  assert.ok(
    priceBlockContent.includes("planName ||"),
    "PlanPriceBlock must accept and prioritize explicit planName"
  );

  const descPath = path.resolve(
    __dirname,
    "../../components/plans/PlanDescription.js"
  );
  const descContent = fs.readFileSync(descPath, "utf8");

  assert.ok(
    descContent.includes("isPoolPlan"),
    "PlanDescription must import and use isPoolPlan"
  );
  assert.ok(
    descContent.includes("isRecurringBilling"),
    "PlanDescription must import and use isRecurringBilling"
  );
});

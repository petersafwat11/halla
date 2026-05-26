/**
 * Plans validation schemas (Zod).
 * Wired into plans.routes.js via `validateZod(schema)` from
 * `shared/middleware/validation`. Joi is forbidden for new code.
 *
 * Field set mirrors the service's `safeUpdate` whitelist in
 * `plans.service.js` and the `PlanModel` shape in `models/PlanModel.js`.
 *
 * The features schema is intentionally narrow: only `whatsAppTemplates`
 * survives the rev. 2 cleanup. Bullet copy lives in `featureBullets`,
 * compensation is universal via `COMPENSATION_PERCENTAGE`, and the
 * business setup fee is a top-level numeric field per plan.
 */

const { z } = require('zod');

const {
  PLAN_TYPES,
  PLAN_FAMILIES,
  BILLING_TYPES,
  PLAN_AVAILABILITY,
} = require('../../shared/constants/plans');

const planTypeEnum = z.enum(Object.values(PLAN_TYPES));
const planFamilyEnum = z.enum(Object.values(PLAN_FAMILIES));
const billingTypeEnum = z.enum(Object.values(BILLING_TYPES));
const availabilityEnum = z.enum(Object.values(PLAN_AVAILABILITY));
const currencyEnum = z.enum(['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR']);

// snake_case lowercase code: letters, digits, underscores; must start
// with a letter; trimmed + lowercased before validation.
const planCode = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'code must be at least 2 chars')
  .max(60, 'code must be at most 60 chars')
  .regex(
    /^[a-z][a-z0-9_]*$/,
    'code must be lowercase snake_case (start with a letter, only [a-z0-9_])'
  );

// SAR major-units: non-negative number with at most 2 decimal places.
// Mirrors the validator in PlanModel.pricingSchema.
const sarAmount = z
  .number()
  .nonnegative('must be ≥ 0')
  .refine(
    (v) => {
      const rounded = Math.round(v * 100) / 100;
      return Math.abs(rounded - v) < 1e-9;
    },
    { message: 'must have at most 2 decimal places (SAR)' }
  );

// Event-count style limit: positive integer OR -1 (= unlimited).
const limitOrUnlimited = z
  .number()
  .int('must be an integer')
  .refine((v) => v === -1 || v >= 1, {
    message: 'must be ≥ 1 or -1 (unlimited)',
  });

// Optional nullable variant for limits that allow null = "no ceiling".
const optionalLimit = z
  .number()
  .int('must be an integer')
  .refine((v) => v === -1 || v >= 0, { message: 'must be ≥ 0 or -1' })
  .nullable();

const pricingSchema = z
  .object({
    oneTime: sarAmount,
  })
  .strict();

const limitsSchema = z
  .object({
    maxEvents: limitOrUnlimited,
    maxInvitesPerEvent: optionalLimit.optional(),
    invitePool: optionalLimit.optional(),
    durationDays: z.number().int().positive().optional(),
    maxHosts: optionalLimit.optional(),
  })
  .strict();

const featuresSchema = z
  .object({
    whatsAppTemplates: z.number().int().min(0).max(100).optional(),
  })
  .strict();

const featureBulletsSchema = z
  .object({
    ar: z.array(z.string().min(1).max(500)).max(50).default([]),
    en: z.array(z.string().min(1).max(500)).max(50).default([]),
  })
  .strict();

const createPlanSchema = z
  .object({
    code: planCode,
    planType: planTypeEnum,
    nameAr: z.string().trim().min(1, 'nameAr is required'),
    nameEn: z.string().trim().min(1, 'nameEn is required'),

    pricing: pricingSchema,
    limits: limitsSchema,
    features: featuresSchema,

    setupFeeAmount: z.number().min(0).optional(),
    featureBullets: featureBulletsSchema.optional(),

    descriptionAr: z.string().trim().optional(),
    descriptionEn: z.string().trim().optional(),
    currency: currencyEnum.optional(),
    availableFor: availabilityEnum.optional(),
    planFamily: planFamilyEnum.nullable().optional(),
    billingType: billingTypeEnum.nullable().optional(),

    sortOrder: z.number().int().optional(),
    isPopular: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  })
  .strict();

// `code` and `planType` are immutable on update.
const updatePlanSchema = createPlanSchema
  .omit({ code: true, planType: true })
  .partial()
  .strict();

module.exports = {
  createPlanSchema,
  updatePlanSchema,
};

const { z } = require('zod');
const { PLAN_TYPES } = require('../../shared/constants/plans');

const codePattern = /^[A-Za-z0-9_-]{3,30}$/;

const planTypeEnum = z.enum(Object.values(PLAN_TYPES));

const baseFields = {
  descriptionEn: z.string().max(200).optional(),
  descriptionAr: z.string().max(200).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
  maxUses: z.number().int().min(0).optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  applicablePlanTypes: z.array(planTypeEnum).optional(),
  minimumAmount: z.number().min(0).optional(),
};

const crossFieldRefinements = (val, ctx) => {
  if (val.discountType === 'percentage' && typeof val.value === 'number' && val.value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'Percentage discount cannot exceed 100',
    });
  }
  if (val.validFrom && val.validUntil && val.validFrom >= val.validUntil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validUntil'],
      message: 'validUntil must be after validFrom',
    });
  }
};

const createDiscountSchema = z
  .object({
    code: z.string().regex(codePattern, 'Code must be 3-30 chars: A-Z, 0-9, _ or -').transform((v) => v.toUpperCase()),
    ...baseFields,
  })
  .strict()
  .superRefine(crossFieldRefinements);

const updateDiscountSchema = z
  .object({
    descriptionEn: baseFields.descriptionEn,
    descriptionAr: baseFields.descriptionAr,
    discountType: baseFields.discountType.optional(),
    value: baseFields.value.optional(),
    maxUses: baseFields.maxUses,
    validFrom: baseFields.validFrom,
    validUntil: baseFields.validUntil,
    isActive: baseFields.isActive,
    applicablePlanTypes: baseFields.applicablePlanTypes,
    minimumAmount: baseFields.minimumAmount,
  })
  .strict()
  .superRefine(crossFieldRefinements);

const validateDiscountSchema = z
  .object({
    code: z.string().regex(codePattern).transform((v) => v.toUpperCase()),
    amount: z.coerce.number().min(0),
    planType: planTypeEnum.nullable().optional(),
  })
  .strict();

module.exports = {
  createDiscountSchema,
  updateDiscountSchema,
  validateDiscountSchema,
};

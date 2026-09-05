const { z } = require('zod');
const { ADDON_TYPES } = require('../../shared/constants/addons');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-char hex ObjectId');

const sourceSchema = z
  .object({
    type: z.enum(['creditcard', 'stcpay', 'applepay']),
    name: z.string().optional(),
    number: z.string().optional(),
    month: z.union([z.number(), z.string()]).optional(),
    year: z.union([z.number(), z.string()]).optional(),
    cvc: z.string().optional(),
    mobile: z.string().optional(),
    token: z.string().nullable().optional(),
  })
  .strict();

// Checkout addons cannot be event-scoped: there's no event yet at initial
// subscription. The host can buy event-scoped addons later via /addons/purchase.
const checkoutAddonItem = z
  .object({
    addonType: z.enum([
      ADDON_TYPES.EXTRA_INVITES,
      ADDON_TYPES.DESIGN_TEMPLATE,
      ADDON_TYPES.BUSINESS_CUSTOMIZATION,
    ]),
    quantity: z.number().int().min(1).max(500).optional(),
    templateType: z
      .enum(['ready_made', 'custom_male', 'custom_themed', 'animated', '3d'])
      .optional(),
    scope: z.enum(['pool', 'org']).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const tiered = val.addonType === ADDON_TYPES.EXTRA_INVITES;
    if (tiered && val.quantity === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'quantity is required for this addon type',
      });
    }
    if (val.addonType === ADDON_TYPES.DESIGN_TEMPLATE) {
      if (!val.templateType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['templateType'],
          message: 'templateType is required for design_template',
        });
      }
    } else if (val.templateType !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templateType'],
        message: 'templateType is only valid for design_template',
      });
    }
  });

const quoteSchema = z
  .object({
    planCode: z.string().min(1),
    addons: z.array(checkoutAddonItem).max(20).default([]),
    discountCode: z.string().min(1).optional(),
  })
  .strict();

const checkoutSchema = z
  .object({
    planCode: z.string().min(1),
    addons: z.array(checkoutAddonItem).max(20).default([]),
    discountCode: z.string().min(1).optional(),
    source: sourceSchema.optional(),
    callbackUrl: z.string().url().optional(),
    subscriptionId: objectId.optional(),
    expectedAmount: z.number().min(0).optional(),
    expectedTotal: z.number().min(0).optional(),
    quoteId: z.string().regex(/^quote_[a-f0-9]{64}$/),
    quoteExpiresAt: z.union([z.string().datetime(), z.date()]),
  })
  .strict();

module.exports = { quoteSchema, checkoutSchema, checkoutAddonItem, sourceSchema };

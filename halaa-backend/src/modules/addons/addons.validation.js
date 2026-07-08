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

const purchaseAddonSchema = z
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
    scope: z.enum(['event', 'pool', 'org']).optional(),
    eventId: objectId.optional(),
    subscriptionId: objectId.optional(),
    source: sourceSchema.optional(),
    // Where Moyasar redirects after 3DS. Web omits it (backend defaults to
    // the web return page); mobile sends a `halla://` deep link so the user
    // returns to the app instead of the website. Mirrors checkout.validation.
    callbackUrl: z.string().url().optional(),
    // Legacy: service prefers the Idempotency-Key header. Body-level key is
    // kept for backward compat with older clients.
    idempotencyKey: z.string().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // quantity: required for tiered addons, forbidden for the rest
    const tiered = val.addonType === ADDON_TYPES.EXTRA_INVITES;
    if (tiered && val.quantity === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'quantity is required for this addon type',
      });
    }
    // templateType: required iff design_template, forbidden otherwise
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
    // event-scoped purchases must include eventId
    if (val.scope === 'event' && !val.eventId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['eventId'],
        message: 'eventId is required when scope is "event"',
      });
    }
  });

const adminActivateSchema = z
  .object({
    notes: z.string().max(2000).optional(),
  })
  .strict();

module.exports = { purchaseAddonSchema, adminActivateSchema };

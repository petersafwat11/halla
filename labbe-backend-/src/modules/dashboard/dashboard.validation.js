const { z } = require('zod');

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'must be an ISO 8601 date');

const adminDashboardQuery = z
  .object({
    period: z
      .enum(['today', 'week', 'month', 'quarter', 'year'])
      .optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.from && val.to && new Date(val.from) > new Date(val.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: '`to` must be greater than or equal to `from`',
      });
    }
  });

module.exports = { adminDashboardQuery };

const { z } = require("zod");

const createPaymentLinkSchema = z.object({
  amountSar: z.string().max(32).refine((v) => v.trim() !== "", {
    message: "amountSar is required",
  }),
  description: z.string().max(200).optional().nullable(),
  clientLabel: z.string().max(100).optional().nullable(),
  expiresInDays: z.union([z.string(), z.number()]).optional(),
  locale: z.enum(["ar", "en"]).optional(),
}).strict();

const dateFilter = z.union([z.string().date(), z.string().datetime({ offset: true })]);
const listPaymentLinksSchema = z.object({
  page: z.string().regex(/^[1-9]\d{0,5}$/).optional(),
  limit: z.string().regex(/^[1-9]\d{0,2}$/).refine((v) => Number(v) <= 100).optional(),
  search: z.string().max(100).optional(),
  status: z
    .enum(["all", "awaiting_payment", "paid", "expired", "canceled", "refunded", "needs_review"])
    .optional(),
  from: dateFilter.optional(),
  to: dateFilter.optional(),
}).refine((v) => !v.from || !v.to || new Date(v.from) <= new Date(v.to), { message: "Date range is invalid" });

module.exports = { createPaymentLinkSchema, listPaymentLinksSchema };

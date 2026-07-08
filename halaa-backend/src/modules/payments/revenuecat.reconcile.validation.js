/**
 * Zod schemas for the authenticated RevenueCat reconcile/preflight endpoints.
 * (Zod-only per project convention.)
 */

const { z } = require("zod");

const catalogCode = z.string().trim().min(1).max(80);

const reconcileExactSchema = z.object({
  catalogCode,
  transactionId: z.string().trim().min(1).max(200).optional(),
  storeProductId: z.string().trim().min(1).max(200).optional(),
  operation: z.enum(["purchase", "restore", "change", "addon"]).optional(),
});

const preflightSchema = z.object({ catalogCode });

const resolveSchema = z.object({
  reason: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
});

module.exports = { reconcileExactSchema, preflightSchema, resolveSchema };

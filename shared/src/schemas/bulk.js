/**
 * Bulk operation schemas — request envelopes and per-item result shapes.
 * Resolves ADM-04 by standardizing the `{ ids: string[] }` body envelope across all admin bulk endpoints.
 */
import { z } from "zod";

const idT = (k) => k;

/**
 * Authoritative schema for all bulk ID requests across hosts, vendors, moderators, events, and tickets.
 */
export const bulkIdsRequestSchema = (t = idT) =>
  z.object({
    ids: z
      .array(
        z
          .string()
          .trim()
          .min(1, t("validation.idRequired") || "ID cannot be empty")
      )
      .min(1, t("validation.atLeastOneId") || "At least one ID is required")
      .max(500, t("validation.tooManyIds") || "Cannot exceed 500 IDs per bulk request"),
  });

/**
 * Standard per-item result in bulk response
 */
export const bulkItemResultSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});

/**
 * Standard bulk action response schema
 */
export const bulkActionResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().int().nonnegative().optional(),
  modifiedCount: z.number().int().nonnegative().optional(),
  succeeded: z.array(z.string()).optional(),
  failed: z.array(z.string()).optional(),
  results: z.array(bulkItemResultSchema).optional(),
  message: z.string().optional(),
});

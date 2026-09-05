import { z } from "zod";
import {
  DESIGN_FULFILLMENT_STATUS,
} from "../constants/addons.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z
  .string()
  .regex(objectIdRegex, "must be a 24-character hexadecimal ObjectId");

export const adminFulfillmentTransitionSchema = z
  .object({
    toStatus: z.enum([
      DESIGN_FULFILLMENT_STATUS.QUEUED,
      DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
      DESIGN_FULFILLMENT_STATUS.FULFILLED,
    ]),
    customerNote: z.string().max(2000, "Customer note must be 2000 characters or fewer").optional().nullable(),
    internalNotes: z.string().max(2000, "Internal notes must be 2000 characters or fewer").optional().nullable(),
    expectedDeliveryAt: z
      .union([
        z.string().datetime(),
        z.date(),
        z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/),
      ])
      .optional()
      .nullable(),
  })
  .strict();

export const adminFulfillmentListQuerySchema = z
  .object({
    status: z
      .enum(["all", "paid", "queued", "in_progress", "fulfilled"])
      .optional()
      .default("all"),
    templateType: z.string().optional(),
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });

export const designFulfillmentItemSchema = z.object({
  id: z.string(),
  addonType: z.literal("design_template"),
  templateType: z.string().nullable().optional(),
  status: z.enum([
    DESIGN_FULFILLMENT_STATUS.PAID,
    DESIGN_FULFILLMENT_STATUS.QUEUED,
    DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
    DESIGN_FULFILLMENT_STATUS.FULFILLED,
    "cancelled",
    "refund_required",
    "refunded",
  ]),
  price: z.number().nonnegative(),
  currency: z.string().default("SAR"),
  fulfillment: z.object({
    requestedAt: z.union([z.string(), z.date()]).nullable().optional(),
    queuedAt: z.union([z.string(), z.date()]).nullable().optional(),
    inProgressAt: z.union([z.string(), z.date()]).nullable().optional(),
    fulfilledAt: z.union([z.string(), z.date()]).nullable().optional(),
    expectedDeliveryAt: z.union([z.string(), z.date()]).nullable().optional(),
    customerNote: z.string().nullable().optional(),
    internalNotes: z.string().nullable().optional(),
    updatedBy: z.any().nullable().optional(),
  }),
  refundState: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});

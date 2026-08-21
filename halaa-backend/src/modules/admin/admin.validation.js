/**
 * Admin module — Zod validation schemas
 * Used via validateZod() middleware in admin.routes.js
 */
const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
const phonePattern = z.string().min(7).max(20);

// ── Hosts ──────────────────────────────────────────────────────────────────
const createHostSchema = z.object({
  phoneNumber: phonePattern,
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  planCode: z.string().optional(),
  subscriptionStatus: z.string().optional(),
});

const findOrCreateHostSchema = z.object({
  phoneNumber: phonePattern,
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

const updateHostStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive', 'pending', 'rejected']),
});

const updateHostSubscriptionSchema = z.object({
  planCode: z.string().min(1),
  status: z.string().optional(),
  reason: z.string().max(500).optional(),
});

const grantExtraInvitesSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(500),
  reason: z.string().max(500).optional(),
});

const bulkIdsSchema = z
  .object({
    ids: z.array(objectId).optional(),
    hostIds: z.array(objectId).optional(),
    vendorIds: z.array(objectId).optional(),
    moderatorIds: z.array(objectId).optional(),
    eventIds: z.array(objectId).optional(),
    ticketIds: z.array(objectId).optional(),
  })
  .transform((data) => {
    const rawList =
      data.ids ||
      data.hostIds ||
      data.vendorIds ||
      data.moderatorIds ||
      data.eventIds ||
      data.ticketIds ||
      [];
    const uniqueIds = Array.from(new Set(rawList.map(String)));
    return { ids: uniqueIds };
  })
  .refine((data) => data.ids.length >= 1 && data.ids.length <= 200, {
    message: 'ids must contain between 1 and 200 items',
    path: ['ids'],
  });

const bulkDeleteHostsSchema = bulkIdsSchema;

// ── Businesses ───────────────────────────────────────────────────────────────
const createBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  phoneNumber: phonePattern,
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  description: z.string().max(2000).optional(),
});

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
});

const assignBusinessPlanSchema = z.object({
  mode: z.enum(['grant', 'checkout']),
  planCode: z.string().min(1),
  discountCode: z.string().optional(),
  grantReason: z.string().max(500).optional(),
});

const updateBusinessStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
});

// ── Vendors ────────────────────────────────────────────────────────────────
const updateVendorStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'pending', 'suspended']),
  reason: z.string().optional(),
});

const updateVendorRatingSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: z.string().optional(),
});

const bulkDeleteVendorsSchema = bulkIdsSchema;

const bulkVendorStatusSchema = z
  .object({
    ids: z.array(objectId).optional(),
    vendorIds: z.array(objectId).optional(),
    status: z.enum(['approved', 'rejected', 'suspended']),
  })
  .transform((data) => {
    const rawList = data.ids || data.vendorIds || [];
    const uniqueIds = Array.from(new Set(rawList.map(String)));
    return { ids: uniqueIds, status: data.status };
  })
  .refine((data) => data.ids.length >= 1 && data.ids.length <= 200, {
    message: 'ids must contain between 1 and 200 items',
    path: ['ids'],
  });

// ── Moderators ─────────────────────────────────────────────────────────────
const createModeratorSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phoneNumber: phonePattern,
  password: z.string().min(6),
  username: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  pageAccess: z.record(z.any()).optional(),
  role: z.string().optional(),
});

const updateModeratorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phoneNumber: phonePattern.optional(),
  permissions: z.array(z.string()).optional(),
  pageAccess: z.record(z.any()).optional(),
  username: z.string().optional(),
  role: z.enum(['moderator', 'admin']).optional(),
});

const updateModeratorStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
});

const bulkDeleteModeratorsSchema = bulkIdsSchema;

const bulkModeratorStatusSchema = z
  .object({
    ids: z.array(objectId).optional(),
    moderatorIds: z.array(objectId).optional(),
    status: z.enum(['active', 'suspended', 'inactive']),
  })
  .transform((data) => {
    const rawList = data.ids || data.moderatorIds || [];
    const uniqueIds = Array.from(new Set(rawList.map(String)));
    return { ids: uniqueIds, status: data.status };
  })
  .refine((data) => data.ids.length >= 1 && data.ids.length <= 200, {
    message: 'ids must contain between 1 and 200 items',
    path: ['ids'],
  });

const { EVENT_STATUS_VALUES } = require('../../shared/constants');

// ── Events ─────────────────────────────────────────────────────────────────
const updateEventStatusSchema = z.object({
  status: z.enum(EVENT_STATUS_VALUES),
});

const bulkDeleteEventsSchema = bulkIdsSchema;

const bulkEventStatusSchema = z
  .object({
    ids: z.array(objectId).optional(),
    eventIds: z.array(objectId).optional(),
    status: z.enum(EVENT_STATUS_VALUES),
  })
  .transform((data) => {
    const rawList = data.ids || data.eventIds || [];
    const uniqueIds = Array.from(new Set(rawList.map(String)));
    return { ids: uniqueIds, status: data.status };
  })
  .refine((data) => data.ids.length >= 1 && data.ids.length <= 200, {
    message: 'ids must contain between 1 and 200 items',
    path: ['ids'],
  });

module.exports = {
  createHostSchema,
  findOrCreateHostSchema,
  updateHostStatusSchema,
  updateHostSubscriptionSchema,
  grantExtraInvitesSchema,
  bulkIdsSchema,
  bulkDeleteHostsSchema,
  createBusinessSchema,
  updateBusinessSchema,
  assignBusinessPlanSchema,
  updateBusinessStatusSchema,
  updateVendorStatusSchema,
  updateVendorRatingSchema,
  bulkDeleteVendorsSchema,
  bulkVendorStatusSchema,
  createModeratorSchema,
  updateModeratorSchema,
  updateModeratorStatusSchema,
  bulkDeleteModeratorsSchema,
  bulkModeratorStatusSchema,
  updateEventStatusSchema,
  bulkDeleteEventsSchema,
  bulkEventStatusSchema,
};

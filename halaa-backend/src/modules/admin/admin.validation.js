/**
 * Admin module — Zod validation schemas
 * Used via validateZod() middleware in admin.routes.js
 */
const { z } = require('zod');
const { isValidPhone, normalizePhoneNumber } = require('../../shared/utils/phone');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
const phonePattern = z
  .string()
  .min(7)
  .max(25)
  .refine((v) => isValidPhone(v), { message: 'Invalid phone number format' })
  .transform((v) => normalizePhoneNumber(v));

const optionalString = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' ? undefined : v));

const optionalEmail = z
  .string()
  .email()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' ? undefined : v));

const optionalPassword = z
  .string()
  .min(8)
  .max(128)
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' ? undefined : v));

// ── Hosts ──────────────────────────────────────────────────────────────────
const createHostSchema = z.object({
  phoneNumber: phonePattern,
  name: z.string().min(2).max(100),
  email: optionalEmail,
  username: optionalString,
  password: optionalPassword,
  planCode: optionalString,
  subscriptionStatus: optionalString,
});

const findOrCreateHostSchema = z.object({
  phoneNumber: phonePattern,
  name: z.string().min(1).max(100).optional(),
  email: optionalEmail,
});

const updateHostStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive', 'pending', 'rejected']),
});

const updateHostSubscriptionSchema = z.object({
  planCode: z.string().min(1),
  status: optionalString,
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
  email: optionalEmail,
  password: optionalPassword,
  description: z.string().max(2000).optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
});

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
});

const assignBusinessPlanSchema = z.object({
  mode: z.enum(['grant', 'checkout']),
  planCode: z.string().min(1),
  discountCode: optionalString,
  grantReason: z.string().max(500).optional(),
});

const updateBusinessStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
});

// ── Vendors ────────────────────────────────────────────────────────────────
const updateVendorStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'pending', 'suspended']),
  reason: optionalString,
});

const updateVendorRatingSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: optionalString,
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
  password: optionalPassword,
  username: optionalString,
  permissions: z.array(z.string()).optional(),
  pageAccess: z.record(z.any()).optional(),
  role: optionalString,
});

const updateModeratorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: optionalEmail,
  phoneNumber: phonePattern.optional().or(z.literal('')).transform((v) => (v ? normalizePhoneNumber(v) : undefined)),
  permissions: z.array(z.string()).optional(),
  pageAccess: z.record(z.any()).optional(),
  username: optionalString,
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

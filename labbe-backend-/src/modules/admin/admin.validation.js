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
});

const bulkDeleteHostsSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
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

const bulkDeleteVendorsSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
});

const bulkVendorStatusSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
  status: z.enum(['approved', 'rejected', 'suspended']),
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
  whitelabelId: objectId.optional(),
  role: z.string().optional(),
});

const updateModeratorSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phoneNumber: phonePattern.optional(),
  permissions: z.array(z.string()).optional(),
  pageAccess: z.record(z.any()).optional(),
  username: z.string().optional(),
  role: z.enum(['moderator', 'admin', 'whitelabel_moderator', 'whitelabel_admin']).optional(),
});

const updateModeratorStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
});

const bulkDeleteModeratorsSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
});

const bulkModeratorStatusSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
  status: z.enum(['active', 'suspended', 'inactive']),
});

// ── Whitelabels ────────────────────────────────────────────────────────────
const updateWhitelabelStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending', 'inactive', 'rejected']),
  dispatchSetupEmail: z.boolean().optional(),
});

const updateWhitelabelSubscriptionSchema = z.object({
  planCode: z.string().min(1),
  status: z.string().optional(),
});

const updateWhitelabelFeatureSchema = z.object({
  feature: z.string().min(1),
  enabled: z.boolean(),
});

const bulkDeleteWhitelabelsSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
});

const bulkWhitelabelStatusSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
  status: z.enum(['active', 'suspended', 'inactive']),
});

// ── Events ─────────────────────────────────────────────────────────────────
const updateEventStatusSchema = z.object({
  status: z.string().min(1),
});

const bulkDeleteEventsSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
});

const bulkEventStatusSchema = z.object({
  ids: z.array(objectId).min(1).max(200),
  status: z.string().min(1),
});

module.exports = {
  createHostSchema,
  findOrCreateHostSchema,
  updateHostStatusSchema,
  updateHostSubscriptionSchema,
  bulkDeleteHostsSchema,
  updateVendorStatusSchema,
  updateVendorRatingSchema,
  bulkDeleteVendorsSchema,
  bulkVendorStatusSchema,
  createModeratorSchema,
  updateModeratorSchema,
  updateModeratorStatusSchema,
  bulkDeleteModeratorsSchema,
  bulkModeratorStatusSchema,
  updateWhitelabelStatusSchema,
  updateWhitelabelSubscriptionSchema,
  updateWhitelabelFeatureSchema,
  bulkDeleteWhitelabelsSchema,
  bulkWhitelabelStatusSchema,
  updateEventStatusSchema,
  bulkDeleteEventsSchema,
  bulkEventStatusSchema,
};

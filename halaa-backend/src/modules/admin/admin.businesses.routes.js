/**
 * Admin Businesses Routes
 * Mounted under /admin. Plural resource name `/businesses`.
 * RBAC: super_admin/admin = FULL, moderator = NONE (BUSINESSES page).
 */

const express = require('express');
const router = express.Router();
const controller = require('./admin.businesses.controller');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { auditLog } = require('../../shared/middleware/auditLog');
const adminValidation = require('./admin.validation');
const { uploadImage } = require('../../shared/utils/s3Upload');

// multipart logo upload (field name: "logo")
const logoUpload = uploadImage.fields([{ name: 'logo', maxCount: 1 }]);

// ── List / detail ────────────────────────────────────────────────────────────
router.get('/businesses',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'view'),
  controller.getBusinesses
);

router.get('/businesses/:id',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'view'),
  validateObjectId('id'),
  controller.getBusinessById
);

// ── Create (multipart: optional logo) ────────────────────────────────────────
router.post('/businesses',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'create'),
  logoUpload,
  validateZod(adminValidation.createBusinessSchema),
  auditLog({ action: 'business.create', targetType: 'user' }),
  controller.createBusiness
);

// ── Update profile ───────────────────────────────────────────────────────────
router.patch('/businesses/:id',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateBusinessSchema),
  auditLog({ action: 'business.update', targetType: 'user', targetIdFrom: (req) => req.params.id }),
  controller.updateBusiness
);

// ── Replace logo (multipart) ─────────────────────────────────────────────────
router.patch('/businesses/:id/logo',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('id'),
  logoUpload,
  auditLog({ action: 'business.logo_update', targetType: 'user', targetIdFrom: (req) => req.params.id }),
  controller.updateBusinessLogo
);

// ── Assign plan (mode A grant / mode B checkout link) ─────────────────────────
router.post('/businesses/:id/assign-plan',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.assignBusinessPlanSchema),
  auditLog({
    action: 'business.assign_plan',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    metadataFrom: (req) => ({ mode: req.body?.mode, planCode: req.body?.planCode }),
  }),
  controller.assignPlan
);

router.post('/businesses/:id/subscription/extra-invites',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.grantExtraInvitesSchema),
  auditLog({
    action: 'business.subscription_extra_invites',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    metadataFrom: (req) => ({ quantity: req.body?.quantity, reason: req.body?.reason }),
  }),
  controller.grantBusinessExtraInvites
);

// ── Checkout-link operations ──────────────────────────────────────────────────
router.post('/businesses/assignments/:assignmentId/revoke',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('assignmentId'),
  auditLog({ action: 'business.assignment_revoke', targetType: 'business_assignment', targetIdFrom: (req) => req.params.assignmentId }),
  controller.revokeAssignment
);

router.post('/businesses/assignments/:assignmentId/regenerate',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('assignmentId'),
  auditLog({ action: 'business.assignment_regenerate', targetType: 'business_assignment', targetIdFrom: (req) => req.params.assignmentId }),
  controller.regenerateAssignment
);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.patch('/businesses/:id/suspend',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('id'),
  auditLog({ action: 'business.suspend', targetType: 'user', targetIdFrom: (req) => req.params.id }),
  controller.suspendBusiness
);

router.patch('/businesses/:id/activate',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'update'),
  validateObjectId('id'),
  auditLog({ action: 'business.activate', targetType: 'user', targetIdFrom: (req) => req.params.id }),
  controller.activateBusiness
);

router.delete('/businesses/:id',
  requirePageAccess(ADMIN_PAGES.BUSINESSES, 'delete'),
  validateObjectId('id'),
  auditLog({ action: 'business.delete', targetType: 'user', targetIdFrom: (req) => req.params.id }),
  controller.deleteBusiness
);

module.exports = router;

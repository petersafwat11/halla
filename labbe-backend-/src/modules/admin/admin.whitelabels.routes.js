const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { filterByWhitelabel } = require('../../shared/middleware/whitelabel');
const { auditLog } = require('../../shared/middleware/auditLog');
const { bulkOperationLimiter } = require('../../shared/middleware/rateLimiter');
const adminValidation = require('./admin.validation');

// ============================================
// WHITELABEL MANAGEMENT (Super Admin Only)
// ============================================

/**
 * @swagger
 * /admin/whitelabels:
 *   get:
 *     summary: Get whitelabels
 *     description: Retrieve a list of all whitelabels. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of whitelabels
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/whitelabels',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'view'),
  adminController.getWhitelabels
);

/**
 * @swagger
 * /admin/whitelabels/{id}:
 *   get:
 *     summary: Get whitelabel by ID
 *     description: Retrieve a single whitelabel by ID. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Whitelabel details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Whitelabel not found
 */
/**
 * @swagger
 * /admin/whitelabels/export:
 *   get:
 *     summary: Export whitelabels
 *     description: Export whitelabels list as CSV/XLSX. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Whitelabels export file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/whitelabels/export',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'view'),
  filterByWhitelabel,
  adminController.exportWhitelabels
);

router.get('/whitelabels/:id',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'view'),
  validateObjectId('id'),
  adminController.getWhitelabelById
);

/**
 * @swagger
 * /admin/whitelabels/{id}/status:
 *   patch:
 *     summary: Update whitelabel status
 *     description: Update the status of a whitelabel. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Whitelabel status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Whitelabel not found
 */
router.patch('/whitelabels/:id/status',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateWhitelabelStatusSchema),
  auditLog({
    action: 'whitelabel.status_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    captureBefore: async (req) => {
      const User = require('../../../models/UserModel');
      const prior = await User.findById(req.params.id).select('status').lean();
      return prior?.status || null;
    },
    changesFrom: (req) => ({ after: { status: req.body?.status } }),
  }),
  adminController.updateWhitelabelStatus
);

/**
 * @swagger
 * /admin/whitelabels/{id}/subscription:
 *   patch:
 *     summary: Update whitelabel subscription
 *     description: Update the subscription of a whitelabel. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Whitelabel subscription updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Whitelabel not found
 */
router.patch('/whitelabels/:id/subscription',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateWhitelabelSubscriptionSchema),
  auditLog({
    action: 'whitelabel.subscription_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    changesFrom: (req) => ({ after: { planCode: req.body?.planCode } }),
  }),
  adminController.updateWhitelabelSubscription
);

/**
 * @swagger
 * /admin/whitelabels/{id}/features:
 *   get:
 *     summary: Get whitelabel features
 *     description: Get the feature toggles for a whitelabel.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Whitelabel features
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Whitelabel not found
 */
router.get('/whitelabels/:id/features',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'view'),
  validateObjectId('id'),
  adminController.getWhitelabelFeatures
);

/**
 * @swagger
 * /admin/whitelabels/{id}/features:
 *   patch:
 *     summary: Update whitelabel feature toggle
 *     description: Toggle a feature for a whitelabel.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [feature, enabled]
 *             properties:
 *               feature:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Feature updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Whitelabel not found
 */
router.patch('/whitelabels/:id/features',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateWhitelabelFeatureSchema),
  auditLog({
    action: 'whitelabel.feature_toggle',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    changesFrom: (req) => ({ after: { feature: req.body?.feature, enabled: req.body?.enabled } }),
  }),
  adminController.updateWhitelabelFeature
);

/**
 * @swagger
 * /admin/whitelabels/{id}:
 *   delete:
 *     summary: Delete whitelabel
 *     description: Delete a whitelabel by ID. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Whitelabel deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Whitelabel not found
 */
router.delete('/whitelabels/:id',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'delete'),
  validateObjectId('id'),
  auditLog({
    action: 'whitelabel.delete',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
  }),
  adminController.deleteWhitelabel
);

/**
 * @swagger
 * /admin/whitelabels/bulk-delete:
 *   post:
 *     summary: Bulk delete whitelabels
 *     description: Delete multiple whitelabels at once. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Whitelabels deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/whitelabels/bulk-delete',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'delete'),
  bulkOperationLimiter,
  validateZod(adminValidation.bulkDeleteWhitelabelsSchema),
  auditLog({
    action: 'whitelabel.bulk_delete',
    targetType: 'user',
    metadataFrom: (req) => ({ ids: req.body?.ids }),
  }),
  adminController.bulkDeleteWhitelabels
);

/**
 * @swagger
 * /admin/whitelabels/bulk-status:
 *   post:
 *     summary: Bulk update whitelabel status
 *     description: Update the status of multiple whitelabels at once. Super admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, status]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *     responses:
 *       200:
 *         description: Whitelabels status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/whitelabels/bulk-status',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'update'),
  bulkOperationLimiter,
  validateZod(adminValidation.bulkWhitelabelStatusSchema),
  auditLog({
    action: 'whitelabel.bulk_status_change',
    targetType: 'user',
    metadataFrom: (req) => ({ ids: req.body?.ids, status: req.body?.status }),
  }),
  adminController.bulkUpdateWhitelabelStatus
);

module.exports = router;

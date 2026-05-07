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
// MODERATOR MANAGEMENT
// ============================================

/**
 * @swagger
 * /admin/moderators:
 *   get:
 *     summary: Get moderators
 *     description: Retrieve a list of all moderators. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of moderators
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/moderators',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'view'),
  filterByWhitelabel,
  adminController.getModerators
);

/**
 * @swagger
 * /admin/moderators:
 *   post:
 *     summary: Create moderator
 *     description: Create a new moderator. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phoneNumber, permissions]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phoneNumber: { type: string }
 *               permissions: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Moderator created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/moderators',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'create'),
  filterByWhitelabel,
  validateZod(adminValidation.createModeratorSchema),
  auditLog({ action: 'moderator.create', targetType: 'user' }),
  adminController.createModerator
);

/**
 * @swagger
 * /admin/moderators/{id}:
 *   patch:
 *     summary: Update moderator
 *     description: Update a moderator by ID. Admin only.
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
 *         description: Moderator updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Moderator not found
 */
router.patch('/moderators/:id',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  validateZod(adminValidation.updateModeratorSchema),
  auditLog({
    action: 'moderator.update',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
  }),
  adminController.updateModerator
);

/**
 * @swagger
 * /admin/moderators/{id}/status:
 *   patch:
 *     summary: Update moderator status
 *     description: Update the status of a moderator. Admin only.
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
 *         description: Moderator status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Moderator not found
 */
router.patch('/moderators/:id/status',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  validateZod(adminValidation.updateModeratorStatusSchema),
  auditLog({
    action: 'moderator.status_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    captureBefore: async (req) => {
      const User = require('../../../models/UserModel');
      const prior = await User.findById(req.params.id).select('status').lean();
      return prior?.status || null;
    },
    changesFrom: (req) => ({ after: { status: req.body?.status } }),
  }),
  adminController.updateModeratorStatus
);

/**
 * @swagger
 * /admin/moderators/{id}:
 *   delete:
 *     summary: Delete moderator
 *     description: Delete a moderator by ID. Admin only.
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
 *         description: Moderator deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Moderator not found
 */
router.delete('/moderators/:id',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'delete'),
  validateObjectId('id'),
  filterByWhitelabel,
  auditLog({
    action: 'moderator.delete',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
  }),
  adminController.deleteModerator
);

/**
 * @swagger
 * /admin/moderators/bulk-delete:
 *   post:
 *     summary: Bulk delete moderators
 *     description: Delete multiple moderators at once. Admin only.
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
 *         description: Moderators deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/moderators/bulk-delete',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'delete'),
  bulkOperationLimiter,
  filterByWhitelabel,
  validateZod(adminValidation.bulkDeleteModeratorsSchema),
  auditLog({
    action: 'moderator.bulk_delete',
    targetType: 'user',
    metadataFrom: (req) => ({ ids: req.body?.ids }),
  }),
  adminController.bulkDeleteModerators
);

/**
 * @swagger
 * /admin/moderators/bulk-status:
 *   post:
 *     summary: Bulk update moderator status
 *     description: Update the status of multiple moderators at once. Admin only.
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
 *         description: Moderators status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/moderators/bulk-status',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'update'),
  bulkOperationLimiter,
  filterByWhitelabel,
  validateZod(adminValidation.bulkModeratorStatusSchema),
  auditLog({
    action: 'moderator.bulk_status_change',
    targetType: 'user',
    metadataFrom: (req) => ({ ids: req.body?.ids, status: req.body?.status }),
  }),
  adminController.bulkUpdateModeratorStatus
);

/**
 * @swagger
 * /admin/moderators/export:
 *   get:
 *     summary: Export moderators
 *     description: Export moderators list as CSV/XLSX. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Moderators export file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/moderators/export',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'view'),
  filterByWhitelabel,
  adminController.exportModerators
);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { auditLog } = require('../../shared/middleware/auditLog');
const { bulkOperationLimiter } = require('../../shared/middleware/rateLimiter');
const adminValidation = require('./admin.validation');

// ============================================
// HOST MANAGEMENT
// ============================================

/**
 * @swagger
 * /admin/hosts:
 *   get:
 *     summary: Get all hosts
 *     description: Retrieve a paginated list of all hosts. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of hosts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// Super Admin and Admin can manage hosts
router.get('/hosts',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  adminController.getHosts
);

/**
 * @swagger
 * /admin/hosts/verify-phone:
 *   get:
 *     summary: Verify host by phone
 *     description: Verify a host by their phone number. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Host verification result
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/hosts/verify-phone',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  adminController.verifyHostByPhone
);

/**
 * @swagger
 * /admin/hosts/find-or-create:
 *   post:
 *     summary: Find or create host
 *     description: Find an existing host or create a new one. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, name]
 *             properties:
 *               phoneNumber: { type: string }
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Host found or created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/hosts/find-or-create',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'create'),
  validateZod(adminValidation.findOrCreateHostSchema),
  adminController.findOrCreateHost
);

/**
 * @swagger
 * /admin/hosts/{id}:
 *   get:
 *     summary: Get host by ID
 *     description: Retrieve a single host by their ID. Admin only.
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
 *         description: Host details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Host not found
 */
/**
 * @swagger
 * /admin/hosts/export:
 *   get:
 *     summary: Export hosts
 *     description: Export hosts list as CSV/XLSX. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Hosts export file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/hosts/export',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  adminController.exportHosts
);

router.get('/hosts/:id',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  validateObjectId('id'),
  adminController.getHostById
);

/**
 * @swagger
 * /admin/hosts:
 *   post:
 *     summary: Create host
 *     description: Create a new host. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, name]
 *             properties:
 *               phoneNumber: { type: string }
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       201:
 *         description: Host created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/hosts',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'create'),
  validateZod(adminValidation.createHostSchema),
  auditLog({ action: 'host.create', targetType: 'user', targetIdFrom: (_req, res) => res.locals?.createdId }),
  adminController.createHost
);

/**
 * @swagger
 * /admin/hosts/{id}/status:
 *   patch:
 *     summary: Update host status
 *     description: Update the status of a host. Admin only.
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
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Host status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Host not found
 */
router.patch('/hosts/:id/status',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateHostStatusSchema),
  auditLog({
    action: 'host.status_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    captureBefore: async (req) => {
      const User = require('../../../models/UserModel');
      const prior = await User.findById(req.params.id).select('status').lean();
      return prior?.status || null;
    },
    changesFrom: (req) => ({ after: { status: req.body?.status } }),
  }),
  adminController.updateHostStatus
);

/**
 * @swagger
 * /admin/hosts/{id}/subscription:
 *   patch:
 *     summary: Update host subscription
 *     description: Update the subscription plan of a host. Admin only.
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
 *             required: [planCode]
 *             properties:
 *               planCode: { type: string }
 *     responses:
 *       200:
 *         description: Host subscription updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Host not found
 */
router.patch('/hosts/:id/subscription',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateHostSubscriptionSchema),
  auditLog({
    action: 'host.subscription_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    changesFrom: (req) => ({ after: { planCode: req.body?.planCode } }),
  }),
  adminController.updateHostSubscription
);

router.post('/hosts/:id/subscription/extra-invites',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.grantExtraInvitesSchema),
  auditLog({
    action: 'host.subscription_extra_invites',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    metadataFrom: (req) => ({ quantity: req.body?.quantity, reason: req.body?.reason }),
  }),
  adminController.grantHostExtraInvites
);

/**
 * @swagger
 * /admin/hosts/{id}:
 *   delete:
 *     summary: Delete host
 *     description: Delete a host by ID. Admin only.
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
 *         description: Host deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Host not found
 */
router.delete('/hosts/:id',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'delete'),
  validateObjectId('id'),
  auditLog({
    action: 'host.delete',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
  }),
  adminController.deleteHost
);

/**
 * @swagger
 * /admin/hosts/bulk-delete:
 *   post:
 *     summary: Bulk delete hosts
 *     description: Delete multiple hosts at once. Admin only.
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
 *         description: Hosts deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/hosts/bulk-delete',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'delete'),
  bulkOperationLimiter,
  validateZod(adminValidation.bulkDeleteHostsSchema),
  auditLog({
    action: 'host.bulk_delete',
    targetType: 'user',
    metadataFrom: (req) => ({ ids: req.body?.ids }),
  }),
  adminController.bulkDeleteHosts
);

module.exports = router;

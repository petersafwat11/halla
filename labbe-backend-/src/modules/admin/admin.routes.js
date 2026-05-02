/**
 * Admin Routes
 * @module modules/admin/admin.routes
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative management endpoints
 */

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo, requirePageAccess } = require('../../shared/middleware/rbac');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId } = require('../../shared/middleware/validation');
const { filterByWhitelabel, injectWhitelabel } = require('../../shared/middleware/whitelabel');
const { auditLog } = require('../../shared/middleware/auditLog');

// All admin routes require authentication
router.use(protect);

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
// Super Admin, Admin, and Whitelabel Admin can manage hosts
router.get('/hosts',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  filterByWhitelabel,
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
  filterByWhitelabel,
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
  filterByWhitelabel,
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
router.get('/hosts/export',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  filterByWhitelabel,
  adminController.exportHosts
);

router.get('/hosts/:id',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  validateObjectId('id'),
  filterByWhitelabel,
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
  filterByWhitelabel,
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
  filterByWhitelabel,
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
  filterByWhitelabel,
  adminController.updateHostSubscription
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
  filterByWhitelabel,
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
  filterByWhitelabel,
  adminController.bulkDeleteHosts
);

// ============================================
// VENDOR MANAGEMENT
// ============================================

/**
 * @swagger
 * /admin/vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieve a paginated list of all vendors. Admin only.
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
 *         description: List of vendors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/vendors',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'view'),
  filterByWhitelabel,
  adminController.getVendors
);

/**
 * @swagger
 * /admin/vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     description: Retrieve a single vendor by their ID. Admin only.
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
 *         description: Vendor details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.get('/vendors/export',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'view'),
  filterByWhitelabel,
  adminController.exportVendors
);

router.get('/vendors/:id',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'view'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.getVendorById
);

/**
 * @swagger
 * /admin/vendors/{id}/status:
 *   patch:
 *     summary: Update vendor status
 *     description: Update the status of a vendor. Admin only.
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
 *         description: Vendor status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.patch('/vendors/:id/status',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  // Phase 1b consumer: vendor approve/reject is the canonical sensitive
  // admin write. The middleware records actor, target, and the requested
  // status into AuditLogModel after a 2xx response.
  auditLog({
    action: 'vendor.status_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    changesFrom: (req) => ({ after: { status: req.body?.status } }),
  }),
  adminController.updateVendorStatus
);

/**
 * @swagger
 * /admin/vendors/{id}/rating:
 *   patch:
 *     summary: Update vendor rating
 *     description: Update the rating of a vendor. Admin only.
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
 *             required: [rating]
 *             properties:
 *               rating: { type: number }
 *     responses:
 *       200:
 *         description: Vendor rating updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.patch('/vendors/:id/rating',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.updateVendorRating
);

/**
 * @swagger
 * /admin/vendors/{id}:
 *   delete:
 *     summary: Delete vendor
 *     description: Delete a vendor by ID. Admin only.
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
 *         description: Vendor deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.delete('/vendors/:id',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'delete'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.deleteVendor
);

/**
 * @swagger
 * /admin/vendors/bulk-delete:
 *   post:
 *     summary: Bulk delete vendors
 *     description: Delete multiple vendors at once. Admin only.
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
 *         description: Vendors deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/vendors/bulk-delete',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'delete'),
  filterByWhitelabel,
  adminController.bulkDeleteVendors
);

/**
 * @swagger
 * /admin/vendors/bulk-status:
 *   post:
 *     summary: Bulk update vendor status
 *     description: Update status of multiple vendors at once. Admin only.
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
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Vendor statuses updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/vendors/bulk-status',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'update'),
  filterByWhitelabel,
  adminController.bulkUpdateVendorStatus
);

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
  filterByWhitelabel,
  adminController.bulkDeleteModerators
);

router.post('/moderators/bulk-status',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'update'),
  filterByWhitelabel,
  adminController.bulkUpdateModeratorStatus
);

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
router.get('/whitelabels/export',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'view'),
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
  adminController.updateWhitelabelSubscription
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
  adminController.bulkDeleteWhitelabels
);

router.post('/whitelabels/bulk-status',
  requirePageAccess(ADMIN_PAGES.WHITELABELS, 'update'),
  adminController.bulkUpdateWhitelabelStatus
);

// ============================================
// EVENT MANAGEMENT (ADMIN)
// ============================================

/**
 * @swagger
 * /admin/events/create-for-host:
 *   post:
 *     summary: Create event for host
 *     description: Create a new event on behalf of a host. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hostId, eventDetails]
 *             properties:
 *               hostId: { type: string }
 *               eventDetails: { type: object }
 *     responses:
 *       201:
 *         description: Event created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/events/create-for-host',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'create'),
  filterByWhitelabel,
  adminController.createEventForHost
);

/**
 * @swagger
 * /admin/events/{id}/status:
 *   patch:
 *     summary: Update event status
 *     description: Update the status of an event. Admin only.
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
 *         description: Event status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.patch('/events/:id/status',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.updateEventStatus
);

/**
 * @swagger
 * /admin/events/{id}:
 *   delete:
 *     summary: Delete event
 *     description: Delete an event by ID. Admin only.
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
 *         description: Event deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.delete('/events/:id',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'delete'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.deleteEvent
);

/**
 * @swagger
 * /admin/events/bulk-delete:
 *   post:
 *     summary: Bulk delete events
 *     description: Delete multiple events at once. Admin only.
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
 *         description: Events deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/events/bulk-delete',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'delete'),
  filterByWhitelabel,
  adminController.bulkDeleteEvents
);

router.post('/events/bulk-status',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'update'),
  filterByWhitelabel,
  adminController.bulkUpdateEventStatus
);

router.get('/event-targets',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'view'),
  filterByWhitelabel,
  adminController.getEventTargets
);

router.get('/users/:id/subscription-info',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  validateObjectId('id'),
  adminController.getUserSubscriptionInfo
);

// ============================================
// PAYMENT MANAGEMENT
// ============================================

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Get all payments
 *     description: Retrieve a paginated list of subscription-based payment records. Admin only.
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
 *         name: status
 *         schema: { type: string, enum: [completed, pending, failed] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of payments with stats
 */
router.get('/payments',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  filterByWhitelabel,
  adminController.getPayments
);

// ============================================
// EXPORT ROUTES
// ============================================

router.get('/payments/export',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  filterByWhitelabel,
  adminController.exportPayments
);

router.get('/hosts/export',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  filterByWhitelabel,
  adminController.exportHosts
);

router.get('/vendors/export',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'view'),
  filterByWhitelabel,
  adminController.exportVendors
);

router.get('/moderators/export',
  requirePageAccess(ADMIN_PAGES.MODERATORS, 'view'),
  filterByWhitelabel,
  adminController.exportModerators
);

router.get('/events/export',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'view'),
  filterByWhitelabel,
  adminController.exportEvents
);

router.get('/events/:id',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'view'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.getEventById
);

router.patch('/events/:id',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.updateEventFull
);

module.exports = router;
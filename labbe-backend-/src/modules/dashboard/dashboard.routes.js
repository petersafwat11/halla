/**
 * Dashboard Routes
 * @module modules/dashboard/dashboard.routes
 */

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and analytics endpoints
 */

const express = require('express');
const router = express.Router();

const dashboardController = require('./dashboard.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo, requirePageAccess } = require('../../shared/middleware/rbac');
const { whitelabelIsolation } = require('../../shared/middleware/whitelabel');
const { ROLES, ADMIN_PAGES } = require('../../shared/constants');

router.use(protect);

/**
 * @swagger
 * /dashboard/admin:
 *   get:
 *     summary: Get admin dashboard stats
 *     description: Get platform-wide statistics for admin dashboard. Requires admin or super_admin role.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for stats filtering
 *     responses:
 *       200:
 *         description: Admin dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/admin',
  requirePageAccess(ADMIN_PAGES.DASHBOARD, 'view'),
  whitelabelIsolation,
  dashboardController.getAdminDashboard
);

/**
 * @swagger
 * /dashboard/host:
 *   get:
 *     summary: Get host dashboard stats
 *     description: Get dashboard statistics for the authenticated host user.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Host dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/host',
  restrictTo(ROLES.HOST),
  dashboardController.getHostDashboard
);

/**
 * @swagger
 * /dashboard/vendor:
 *   get:
 *     summary: Get vendor dashboard stats
 *     description: Get dashboard statistics for the authenticated vendor user.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/vendor',
  restrictTo(ROLES.VENDOR),
  dashboardController.getVendorDashboard
);

module.exports = router;

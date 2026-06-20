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
const { validateZod } = require('../../shared/middleware/validation');
const { ROLES, ADMIN_PAGES } = require('../../shared/constants');
const { adminDashboardQuery } = require('./dashboard.validation');

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
 *           enum: [today, week, month, quarter, year]
 *         description: Predefined period window for the stats. Ignored if `from` or `to` is provided.
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO 8601 start of custom range (must be <= `to`).
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO 8601 end of custom range.
 *     responses:
 *       200:
 *         description: Admin dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AdminDashboardStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/admin',
  requirePageAccess(ADMIN_PAGES.DASHBOARD, 'view'),
  validateZod(adminDashboardQuery, 'query'),
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
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HostDashboardStats'
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

module.exports = router;

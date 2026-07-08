/**
 * Subscriptions Routes
 * @module modules/subscriptions/subscriptions.routes
 */

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription read endpoints, admin assign, and payment history.
 *     Self-subscribe / plan-switch / cancel flow through `POST /payments/checkout`.
 */

const express = require('express');
const router = express.Router();

const subscriptionsController = require('./subscriptions.controller');
const { adminAssignSchema } = require('./subscriptions.validation');

const { protect } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { auditLog } = require('../../shared/middleware/auditLog');
const { validateZod } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');

router.use(protect);

/**
 * @swagger
 * /subscriptions/my-subscription:
 *   get:
 *     summary: Get my active subscription(s)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active subscription summary for the calling user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptions:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Subscription' }
 *                     hasSubscription: { type: boolean }
 *                     subscription:
 *                       oneOf:
 *                         - $ref: '#/components/schemas/Subscription'
 *                         - { type: 'null' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/my-subscription', subscriptionsController.getMySubscription);

/**
 * @swagger
 * /subscriptions/admin/assign:
 *   post:
 *     summary: Admin-assign a subscription to a user (SUPER_ADMIN)
 *     description: Assigns a plan to a target user without payment. Audit-logged. Idempotency-Key supported.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminAssignSubscriptionRequest'
 *     responses:
 *       201:
 *         description: Subscription assigned successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 */
router.post(
  '/admin/assign',
  restrictTo(ROLES.SUPER_ADMIN),
  validateZod(adminAssignSchema),
  idempotency({ scope: 'subscriptions.admin_assign' }),
  auditLog({
    action: 'subscription.assigned_by_admin',
    targetType: 'subscription',
    targetIdFrom: (req) => req.body?.userId,
    changesFrom: (req) => ({
      after: { userId: req.body?.userId, planCode: req.body?.planCode },
    }),
    metadataFrom: (req) => ({ notes: req.body?.notes }),
  }),
  subscriptionsController.adminAssignSubscription
);

/**
 * @swagger
 * /subscriptions/payments:
 *   get:
 *     summary: Get my payment history
 *     description: Paginated payment history for the calling user.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, completed, pending, failed, refunded], default: all }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Payment history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 data: { $ref: '#/components/schemas/PaymentHistoryResponse' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/payments', subscriptionsController.getMyPayments);

/**
 * @swagger
 * /subscriptions/payments/export:
 *   get:
 *     summary: Export my payment history as Excel
 *     description: Streams an .xlsx of the calling user's payments (filtered by status / date range).
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, completed, pending, failed, refunded] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Excel file stream }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/payments/export', subscriptionsController.exportMyPayments);

module.exports = router;

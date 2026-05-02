/**
 * Subscriptions Routes
 * Route definitions for subscription management module
 * @module modules/subscriptions/subscriptions.routes
 */

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription and billing management endpoints
 */

const express = require('express');
const router = express.Router();

// Controller
const subscriptionsController = require('./subscriptions.controller');

// Middleware (using existing during migration)
const { protect } = require('../../shared/middleware/auth');

// All routes require authentication
router.use(protect);

// ============================================
// SUBSCRIPTION ROUTES
// ============================================

/**
 * @swagger
 * /subscriptions/my-subscription:
 *   get:
 *     summary: Get my subscription
 *     description: Get current user's subscription details
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/my-subscription', subscriptionsController.getMySubscription);

/**
 * @swagger
 * /subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to plan
 *     description: Subscribe to a subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscribeRequest'
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/subscribe', subscriptionsController.subscribe);

/**
 * @swagger
 * /subscriptions/change-plan:
 *   post:
 *     summary: Change subscription plan
 *     description: Change to a different plan (upgrade or downgrade)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planCode]
 *             properties:
 *               planCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plan changed successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/change-plan', subscriptionsController.changePlan);

/**
 * @swagger
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel subscription
 *     description: Cancel current subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/cancel', subscriptionsController.cancelSubscription);

// ============================================
// LIMIT VALIDATION ROUTES
// ============================================

/**
 * @swagger
 * /subscriptions/validate-limits:
 *   post:
 *     summary: Validate subscription limits
 *     description: Check if an action is within subscription limits
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *               count:
 *                 type: number
 *     responses:
 *       200:
 *         description: Limit validation result
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/validate-limits', subscriptionsController.validateLimits);

/**
 * @swagger
 * /subscriptions/limits:
 *   get:
 *     summary: Get package limits
 *     description: Get current subscription package limits
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Package limits retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/limits', subscriptionsController.getPackageLimits);

/**
 * @swagger
 * /subscriptions/features/{featureName}:
 *   get:
 *     summary: Check feature access
 *     description: Check if current subscription has access to a feature
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: featureName
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature name to check
 *     responses:
 *       200:
 *         description: Feature access result
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/features/:featureName', subscriptionsController.checkFeatureAccess);

// ============================================
// PLANS ROUTES
// ============================================

/**
 * @swagger
 * /subscriptions/plans:
 *   get:
 *     summary: Get available plans
 *     description: Get list of available subscription plans
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: for
 *         schema:
 *           type: string
 *         description: Filter plans by target
 *     responses:
 *       200:
 *         description: Plans retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/plans', subscriptionsController.getAvailablePlans);

/**
 * @swagger
 * /subscriptions/plans/{code}:
 *   get:
 *     summary: Get plan by code
 *     description: Get a specific subscription plan by its code
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan code
 *     responses:
 *       200:
 *         description: Plan details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Plan'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/plans/:code', subscriptionsController.getPlanByCode);

module.exports = router;

/**
 * Plans Routes
 * Route definitions for subscription plans
 * @module modules/plans/plans.routes
 */

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Subscription plan management endpoints
 */

const express = require('express');
const router = express.Router();

const plansController = require('./plans.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { auditLog } = require('../../shared/middleware/auditLog');
const { ROLES } = require('../../shared/constants');
const { validateObjectId } = require('../../shared/middleware/validation');

// Admin plan routes (protected)
router.get(
  '/admin/all',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  plansController.getAllPlansAdmin
);

// FLOW-08-F01: create
router.post(
  '/admin',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  auditLog({
    action: 'plan.created',
    targetType: 'system',
    targetIdFrom: (req, res) => res.locals?.planAudit?.after?.id,
    changesFrom: (req, res) => ({
      after: res.locals?.planAudit?.after || { code: req.body?.code },
    }),
    metadataFrom: (req) => ({ code: req.body?.code }),
  }),
  plansController.createPlan
);

// FLOW-08-F01: soft-delete
router.delete(
  '/admin/:code',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  auditLog({
    action: 'plan.deactivated',
    targetType: 'system',
    changesFrom: (req, res) => res.locals?.planAudit || {},
    metadataFrom: (req) => ({ code: req.params?.code }),
  }),
  plansController.deletePlan
);

// FLOW-08-F02 + FLOW-08-F03: validated update with before/after audit
router.patch(
  '/admin/:code',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  auditLog({
    action: 'plan.updated',
    targetType: 'system',
    changesFrom: (req, res) => res.locals?.planAudit || {},
    metadataFrom: (req) => ({ code: req.params?.code }),
  }),
  plansController.updatePlanByCode
);

// All routes below are public

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Get all active plans
 *     description: Retrieve all active subscription plans
 *     tags: [Plans]
 *     security: []
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Plan'
 */
router.get('/', plansController.getPlans);

/**
 * @swagger
 * /plans/business:
 *   get:
 *     summary: Get business plans
 *     description: Retrieve all business-tier subscription plans (event, quarterly, annual)
 *     tags: [Plans]
 *     security: []
 *     responses:
 *       200:
 *         description: Business plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.get('/business', plansController.getBusinessPlans);

/**
 * @swagger
 * /plans/enterprise:
 *   get:
 *     summary: Get enterprise plans (backward compat — use /business)
 *     description: Retrieve all enterprise-tier subscription plans
 *     tags: [Plans]
 *     security: []
 *     responses:
 *       200:
 *         description: Enterprise plans retrieved successfully
 */
router.get('/enterprise', plansController.getBusinessPlans);

/**
 * @swagger
 * /plans/host:
 *   get:
 *     summary: Get host plans
 *     description: Retrieve host plans (single event and monthly)
 *     tags: [Plans]
 *     security: []
 *     responses:
 *       200:
 *         description: Host plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Plan'
 */
router.get('/host', plansController.getHostPlans);

/**
 * @swagger
 * /plans/code/{code}:
 *   get:
 *     summary: Get plan by code
 *     description: Retrieve a specific plan by its unique code
 *     tags: [Plans]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan code (e.g. host_basic_monthly)
 *     responses:
 *       200:
 *         description: Plan retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Plan'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/code/:code', plansController.getPlanByCode);

/**
 * @swagger
 * /plans/{id}:
 *   get:
 *     summary: Get plan by ID
 *     description: Retrieve a specific plan by its ID
 *     tags: [Plans]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Plan retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Plan'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateObjectId('id'), plansController.getPlanById);

module.exports = router;

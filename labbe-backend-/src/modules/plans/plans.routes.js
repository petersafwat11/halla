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
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { auditLog } = require('../../shared/middleware/auditLog');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { createPlanSchema, updatePlanSchema } = require('./plans.schemas');

// ============================================
// ADMIN ROUTES (protected)
// ============================================

/**
 * @swagger
 * /plans/admin/all:
 *   get:
 *     summary: List all plans (admin)
 *     description: Returns every plan including inactive ones. Requires `manage_plans` view access.
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
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
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Plan'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/admin/all',
  protect,
  requirePageAccess(ADMIN_PAGES.MANAGE_PLANS, 'view'),
  plansController.getAllPlansAdmin
);

/**
 * @swagger
 * /plans/admin:
 *   post:
 *     summary: Create a plan (admin)
 *     description: Creates a new subscription plan. Requires `manage_plans` create access.
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlanCreate'
 *     responses:
 *       201:
 *         description: Plan created successfully
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
 *                     plan:
 *                       $ref: '#/components/schemas/Plan'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Plan code already exists
 */
router.post(
  '/admin',
  protect,
  requirePageAccess(ADMIN_PAGES.MANAGE_PLANS, 'create'),
  validateZod(createPlanSchema),
  auditLog({
    action: 'plan.created',
    targetType: 'system',
    targetIdFrom: (req, res) => res.locals?.planAudit?.planId,
    changesFrom: (req, res) => ({
      after: res.locals?.planAudit?.after || { code: req.body?.code },
    }),
    metadataFrom: (req, res) => ({
      code: req.body?.code,
      planId: res.locals?.planAudit?.planId,
    }),
  }),
  plansController.createPlan
);

/**
 * @swagger
 * /plans/admin/{code}:
 *   delete:
 *     summary: Soft-delete a plan (admin)
 *     description: |
 *       Marks the plan inactive. Hard delete is intentionally blocked to
 *       preserve historical subscriptions. Returns 409 if any active
 *       subscribers are on the plan. Requires `manage_plans` delete access.
 *     tags: [Plans]
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
 *         description: Plan deactivated successfully
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
 *                     plan:
 *                       $ref: '#/components/schemas/Plan'
 *                     activeSubscribers:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Plan still has active subscribers
 */
router.delete(
  '/admin/:code',
  protect,
  requirePageAccess(ADMIN_PAGES.MANAGE_PLANS, 'delete'),
  auditLog({
    action: 'plan.deactivated',
    targetType: 'system',
    targetIdFrom: (req, res) => res.locals?.planAudit?.planId,
    changesFrom: (req, res) => ({
      before: res.locals?.planAudit?.before,
      after: res.locals?.planAudit?.after,
    }),
    metadataFrom: (req, res) => ({
      code: req.params?.code,
      planId: res.locals?.planAudit?.planId,
    }),
  }),
  plansController.deletePlan
);

/**
 * @swagger
 * /plans/admin/{code}:
 *   patch:
 *     summary: Update a plan (admin)
 *     description: |
 *       Patches a plan by code. `code` and `planType` are immutable. Limit
 *       reductions that would orphan active subscribers are rejected with
 *       400. Requires `manage_plans` update access.
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlanUpdate'
 *     responses:
 *       200:
 *         description: Plan updated successfully
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
 *                     plan:
 *                       $ref: '#/components/schemas/Plan'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/admin/:code',
  protect,
  requirePageAccess(ADMIN_PAGES.MANAGE_PLANS, 'update'),
  validateZod(updatePlanSchema),
  auditLog({
    action: 'plan.updated',
    targetType: 'system',
    targetIdFrom: (req, res) => res.locals?.planAudit?.planId,
    changesFrom: (req, res) => ({
      before: res.locals?.planAudit?.before,
      after: res.locals?.planAudit?.after,
    }),
    metadataFrom: (req, res) => ({
      code: req.params?.code,
      planId: res.locals?.planAudit?.planId,
    }),
  }),
  plansController.updatePlanByCode
);

// ============================================
// PUBLIC ROUTES
// ============================================

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
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Plan'
 */
router.get('/', plansController.getPlans);

/**
 * @swagger
 * /plans/business:
 *   get:
 *     summary: Get business plans
 *     description: Retrieve all business-availability subscription plans (event, quarterly, annual)
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
 *                   $ref: '#/components/schemas/BusinessPlansResponse'
 */
router.get('/business', plansController.getBusinessPlans);

/**
 * @swagger
 * /plans/host:
 *   get:
 *     summary: Get host plans
 *     description: Retrieve host plans (basic and premium × event and monthly)
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
 *                   $ref: '#/components/schemas/HostPlansResponse'
 */
router.get('/host', plansController.getHostPlans);

/**
 * @swagger
 * /plans/landing:
 *   get:
 *     summary: Get landing page plans
 *     description: Returns both host and business plans for the public landing page in a single call
 *     tags: [Plans]
 *     security: []
 *     responses:
 *       200:
 *         description: Landing plans retrieved successfully
 */
router.get('/landing', plansController.getLandingPlans);

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
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: '#/components/schemas/Plan'
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
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: '#/components/schemas/Plan'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateObjectId('id'), plansController.getPlanById);

module.exports = router;

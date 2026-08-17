/**
 * Discounts Routes
 * @module modules/discounts/discounts.routes
 */

const express = require('express');
const router = express.Router();
const discountsController = require('./discounts.controller');
const { protect } = require('../../shared/middleware/auth');
const { requirePageAccess, ADMIN_PAGES } = require('../../shared/middleware/rbac');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { auditLog } = require('../../shared/middleware/auditLog');
const { authLimiter } = require('../../shared/middleware/rateLimiter');
const Discount = require('../../../models/DiscountModel');
const {
  createDiscountSchema,
  updateDiscountSchema,
  validateDiscountSchema,
} = require('./discounts.validation');

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * tags:
 *   - name: Discounts
 *     description: Discount / coupon code management and validation
 */

/**
 * @swagger
 * /discounts/validate:
 *   post:
 *     summary: Validate a discount code at checkout
 *     description: |
 *       Returns whether the supplied code can be applied to the given amount
 *       and (optionally) plan type. Rate-limited because the endpoint reveals
 *       the existence of codes; reasons for failure are deliberately
 *       collapsed where they would leak code state.
 *     tags: [Discounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DiscountValidateRequest'
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DiscountValidateResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
  '/validate',
  authLimiter,
  validateZod(validateDiscountSchema),
  discountsController.validate
);

/**
 * @swagger
 * /discounts/admin:
 *   get:
 *     summary: List discount codes (admin)
 *     tags: [Discounts]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Discount' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/admin',
  requirePageAccess(ADMIN_PAGES.DISCOUNTS, 'view'),
  discountsController.getAll
);

/**
 * @swagger
 * /discounts/admin:
 *   post:
 *     summary: Create a discount code (admin)
 *     tags: [Discounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DiscountInput'
 *     responses:
 *       201:
 *         description: Created discount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Discount' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post(
  '/admin',
  requirePageAccess(ADMIN_PAGES.DISCOUNTS, 'create'),
  validateZod(createDiscountSchema),
  auditLog({
    action: 'discount.created',
    targetType: 'discount',
    targetIdFrom: (req, res) => res.locals?.discountAudit?.id,
    changesFrom: (req) => ({ after: req.body }),
  }),
  discountsController.create
);

/**
 * @swagger
 * /discounts/admin/{id}:
 *   get:
 *     summary: Get a discount by ID (admin)
 *     tags: [Discounts]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Discount document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Discount' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/admin/:id',
  requirePageAccess(ADMIN_PAGES.DISCOUNTS, 'view'),
  validateObjectId('id'),
  discountsController.getById
);

/**
 * @swagger
 * /discounts/admin/{id}:
 *   patch:
 *     summary: Update a discount (admin)
 *     tags: [Discounts]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DiscountInput'
 *     responses:
 *       200:
 *         description: Updated discount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Discount' }
 */
router.patch(
  '/admin/:id',
  requirePageAccess(ADMIN_PAGES.DISCOUNTS, 'update'),
  validateObjectId('id'),
  validateZod(updateDiscountSchema),
  auditLog({
    action: 'discount.updated',
    targetType: 'discount',
    targetIdFrom: (req) => req.params.id,
    captureBefore: async (req) =>
      Discount.findById(req.params.id)
        .select('-__v -createdBy -usedCount')
        .lean(),
    changesFrom: (req) => ({ after: req.body }),
  }),
  discountsController.update
);

/**
 * @swagger
 * /discounts/admin/{id}/toggle:
 *   patch:
 *     summary: Toggle discount active status (admin)
 *     tags: [Discounts]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Updated discount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Discount' }
 */
router.patch(
  '/admin/:id/toggle',
  requirePageAccess(ADMIN_PAGES.DISCOUNTS, 'update'),
  validateObjectId('id'),
  auditLog({
    action: 'discount.toggled',
    targetType: 'discount',
    targetIdFrom: (req) => req.params.id,
    changesFrom: (req, res) => ({
      after: { isActive: res.locals?.discountAudit?.isActive },
    }),
  }),
  discountsController.toggleStatus
);

/**
 * @swagger
 * /discounts/admin/{id}:
 *   delete:
 *     summary: Delete a discount (admin)
 *     tags: [Discounts]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Discount deleted successfully' }
 */
router.delete(
  '/admin/:id',
  requirePageAccess(ADMIN_PAGES.DISCOUNTS, 'delete'),
  validateObjectId('id'),
  auditLog({
    action: 'discount.deleted',
    targetType: 'discount',
    targetIdFrom: (req) => req.params.id,
  }),
  discountsController.delete
);

module.exports = router;

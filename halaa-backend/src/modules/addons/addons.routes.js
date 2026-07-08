const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { auditLog } = require('../../shared/middleware/auditLog');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { purchaseLimiter } = require('../../shared/middleware/rateLimiter');
const { ROLES } = require('../../shared/constants');
const {
  getAvailableAddons,
  purchaseAddon,
  getMyAddons,
  adminActivateAddon,
} = require('./addons.controller');
const {
  purchaseAddonSchema,
  adminActivateSchema,
} = require('./addons.validation');

/**
 * @swagger
 * tags:
 *   - name: Addons
 *     description: Addon catalog, purchase, and admin activation
 */

/**
 * @swagger
 * /addons:
 *   get:
 *     summary: Get the public addon catalog
 *     description: Returns all available addon tiers (extra invites, extra reminders, design templates, business customization). Public, no PII.
 *     tags: [Addons]
 *     security: []
 *     responses:
 *       200:
 *         description: Catalog tiers grouped by addon type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/AddonCatalog'
 */
// Public catalog: no PII, identical for every caller. Intentionally unauthenticated
// so unsigned-in users can see pricing on the marketing surface.
router.get('/', getAvailableAddons);

/**
 * @swagger
 * /addons/purchase:
 *   post:
 *     summary: Purchase an addon
 *     description: |
 *       Charges the user via the configured payment provider and (on success)
 *       creates an addon row + applies the corresponding quota update. When
 *       the payment provider returns a 3DS redirect, the response is HTTP 200
 *       with `data.requiresAction === true`; the addon row is created later
 *       by the webhook / `finalizePending3ds` flow.
 *
 *       Idempotency-Key header is strongly recommended to make double-tap
 *       client retries safe.
 *     tags: [Addons]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string }
 *         description: Per-request unique key. Layered with provider-side idempotency.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddonPurchaseRequest'
 *     responses:
 *       200:
 *         description: 3DS redirect required — client must redirect to `data.redirectUrl`
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Addon3DSResponse'
 *       201:
 *         description: Addon purchased and activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddonPurchaseResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/purchase',
  authenticate,
  purchaseLimiter,
  validateZod(purchaseAddonSchema),
  idempotency({ scope: 'addons.purchase' }),
  purchaseAddon
);

/**
 * @swagger
 * /addons/my:
 *   get:
 *     summary: List the current user's purchased addons
 *     tags: [Addons]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: User's addon history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Addon' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/my', authenticate, getMyAddons);

/**
 * @swagger
 * /addons/admin/{id}/activate:
 *   post:
 *     summary: Admin — activate a pending business-customization addon
 *     description: Flips a `pending_provisioning` addon to `active`. Audit-logged.
 *     tags: [Addons]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminActivateRequest'
 *     responses:
 *       200:
 *         description: Activated addon
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Addon' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Admin activation hook for business-customization addons. Audit-logged so the
// manual provisioning step is traceable; res.locals.addonAudit is populated by
// the controller and consumed by the auditLog middleware below.
router.post(
  '/admin/:id/activate',
  authenticate,
  restrictTo(ROLES.SUPER_ADMIN),
  validateObjectId('id'),
  validateZod(adminActivateSchema),
  idempotency({ scope: 'addons.admin_activate' }),
  auditLog({
    action: 'addon.activated_by_admin',
    targetType: 'system',
    targetIdFrom: (req) => req.params.id,
    metadataFrom: (req, res) => ({
      addonId: req.params.id,
      notes: req.body?.notes || null,
      status: res.locals?.addonAudit?.status,
    }),
  }),
  adminActivateAddon
);

module.exports = router;

const express = require('express');
const router = express.Router();

const paymentsController = require('./payments.controller');
const checkoutController = require('./checkout.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { validateZod } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');
const { checkoutSchema } = require('./checkout.validation');

// ─── Public webhook (NO `protect`) ────────────────────────────
router.post('/webhook', paymentsController.webhook);

// ─── Stub-only 3DS completion helper (dev/CI) ─────────────────
router.get('/_stub/3ds-complete', paymentsController.stubComplete3ds);

// ─── Authenticated routes ─────────────────────────────────────
router.use(protect);

/**
 * @swagger
 * /payments/checkout:
 *   post:
 *     summary: Bundled plan + addons checkout
 *     description: |
 *       Charges plan price + addon prices − discount as a single Moyasar
 *       transaction. On success: activates subscription + creates each addon
 *       row (sequentially with line-item compensating refunds on per-addon
 *       failure). On 3DS, returns `requiresAction: true` and stashes the
 *       intent on `Payment.metadata.pendingCheckoutIntent`; the webhook /
 *       poll3ds path resumes finalization once the user returns.
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckoutRequest' }
 *     responses:
 *       200:
 *         description: 3DS redirect required — client must redirect to `data.redirectUrl`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Checkout3DSResponse' }
 *       201:
 *         description: Checkout completed; subscription + addons active
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CheckoutResponse' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/checkout',
  validateZod(checkoutSchema),
  idempotency({ scope: 'payments.checkout' }),
  checkoutController.checkout
);

router.get('/:id', paymentsController.getById);
router.get('/:id/poll', paymentsController.poll3ds);

// ─── Admin actions ────────────────────────────────────────────
//
// We use restrictTo(SUPER_ADMIN, ADMIN) NOT
// requirePageAccess(ADMIN_PAGES.PAYMENTS, 'full') for two reasons:
//   1. canAccessPage doesn't treat 'full' as a valid action — using it
//      here would 403 every role.
//   2. WHITELABEL_ADMIN has PAYMENTS: FULL on their org and would gain
//      refund authority. The §11 matrix says they should not.
//
// restrictTo(SUPER_ADMIN, ADMIN) is the explicit, auditable gate.
router.post(
  '/:id/refund',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  idempotency({ scope: 'payments.refund' }),
  paymentsController.refund
);
router.post(
  '/:id/capture',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  idempotency({ scope: 'payments.capture' }),
  paymentsController.capture
);
router.post(
  '/:id/void',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  idempotency({ scope: 'payments.void' }),
  paymentsController.void
);

module.exports = router;

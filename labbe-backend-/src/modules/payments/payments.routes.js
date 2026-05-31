const express = require('express');
const router = express.Router();

const paymentsController = require('./payments.controller');
const checkoutController = require('./checkout.controller');
const { protect } = require('../../shared/middleware/auth');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { validateZod, validateObjectId } = require('../../shared/middleware/validation');
const { ADMIN_PAGES } = require('../../shared/constants');
const { checkoutSchema } = require('./checkout.validation');
const { refundSchema, captureSchema } = require('./payments.validation');

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Moyasar webhook receiver (public)
 *     description: |
 *       Public, server-to-server endpoint. Authenticated by a constant
 *       `secret_token` (header `X-Moyasar-Auth` or body `secret_token`)
 *       compared in constant time against `MOYASAR_WEBHOOK_SECRET`.
 *       Idempotent on `<moyasarPaymentId>:<eventType>`. Always returns 200
 *       on duplicate or unknown payments to stop Moyasar retries.
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/MoyasarWebhookPayload' }
 *     responses:
 *       200: { description: Event accepted (handled or deduplicated) }
 *       400: { description: Malformed payload }
 *       401: { description: Bad secret token }
 *       403: { description: Source IP not in MOYASAR_WEBHOOK_IP_WHITELIST }
 *       500: { description: Handler error — Moyasar will retry }
 */
router.post('/webhook', paymentsController.webhook);

/**
 * @swagger
 * /payments/app-return:
 *   get:
 *     summary: Mobile 3DS deep-link bounce (public)
 *     description: |
 *       Public redirect target handed to Moyasar as `callback_url` by the
 *       mobile app. Moyasar appends `?id=&status=`; this 302s to the
 *       `halla://host/payments/return` deep link so the in-app browser
 *       returns the user to the app instead of the auth-gated web pages.
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       302: { description: Redirect to the app deep link }
 */
router.get('/app-return', paymentsController.appReturn);

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
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post(
  '/checkout',
  validateZod(checkoutSchema),
  idempotency({ scope: 'payments.checkout' }),
  checkoutController.checkout
);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get payment by id (host-self only)
 *     description: |
 *       Returns the caller's own payment. Admin reads MUST go through
 *       `/admin/payments/{id}` which enforces whitelabel scope; this
 *       endpoint rejects admin-class roles with 403.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Payment document
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentResponse' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: "Admin role — use /admin/payments/{id}" }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// NOTE: NO `validateObjectId` here. The id may be either a Mongo `_id`
// (admin-side / canonical) OR a Moyasar payment id (3DS callback uses
// `?id=<moyasar-uuid>`). Format detection happens in the service.
router.get('/:id', paymentsController.getById);

/**
 * @swagger
 * /payments/{id}/poll:
 *   get:
 *     summary: Poll payment status during 3DS return (host-self only)
 *     description: |
 *       Reconciles the payment with Moyasar if it is still `pending` or
 *       `pending_3ds`, then runs the matching finalization (subscription /
 *       addon / checkout bundle) when status flips to `paid`. Idempotent:
 *       repeated calls converge on the same state. Admin-class roles get
 *       403 — use `/admin/payments/{id}`.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Payment after reconcile + optional finalize
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentResponse' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: "Admin role — use /admin/payments/{id}" }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Same dual-id behavior as `/:id` above — Moyasar's callback id is a UUID,
// not a Mongo ObjectId, so we cannot statically validate its format here.
router.get('/:id/poll', paymentsController.poll3ds);

// Sensitive global actions — use the `manage` verb so WHITELABEL_ADMIN
// (who has PAYMENTS:FULL on their own org) cannot pass. `manage` resolves
// to FULL access AND role ∈ {SUPER_ADMIN, ADMIN}.
/**
 * @swagger
 * /payments/{id}/refund:
 *   post:
 *     summary: Issue a refund (full or partial)
 *     description: |
 *       Restricted to global admins (SUPER_ADMIN, ADMIN). Idempotent via
 *       `Idempotency-Key` header. Full refund auto-cancels the linked
 *       subscription inside the same Mongo transaction as the Payment
 *       update. Addon-side cleanup is intentionally manual.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number, minimum: 0.01, description: "Optional partial amount; defaults to remaining balance" }
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Updated Payment
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentResponse' }
 *       400: { description: Refund out-of-status or amount exceeds remaining }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Caller lacks `manage` access on payments }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  '/:id/refund',
  validateObjectId('id'),
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage'),
  validateZod(refundSchema),
  idempotency({ scope: 'payments.refund' }),
  paymentsController.refund
);

/**
 * @swagger
 * /payments/{id}/capture:
 *   post:
 *     summary: Capture an authorized payment
 *     description: Restricted to global admins. Idempotent via `Idempotency-Key`.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number, minimum: 0.01 }
 *     responses:
 *       200:
 *         description: Captured Payment
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentResponse' }
 *       400: { description: Payment not in `authorized` status }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Caller lacks `manage` access on payments }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  '/:id/capture',
  validateObjectId('id'),
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage'),
  validateZod(captureSchema),
  idempotency({ scope: 'payments.capture' }),
  paymentsController.capture
);

/**
 * @swagger
 * /payments/{id}/void:
 *   post:
 *     summary: Void an authorized payment
 *     description: Restricted to global admins. Idempotent via `Idempotency-Key`. No body.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Voided Payment
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaymentResponse' }
 *       400: { description: Payment not in `authorized` status }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Caller lacks `manage` access on payments }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  '/:id/void',
  validateObjectId('id'),
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage'),
  idempotency({ scope: 'payments.void' }),
  paymentsController.void
);

module.exports = router;

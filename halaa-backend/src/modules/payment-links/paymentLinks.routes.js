const express = require("express");
const router = express.Router();

const controller = require("./paymentLinks.controller");
const { requirePaymentLinksView, requirePaymentLinksManage } = require("./paymentLinks.auth");
const { protect } = require("../../shared/middleware/auth");
const { idempotency } = require("../../shared/middleware/idempotency");
const { validateZod, validateObjectId } = require("../../shared/middleware/validation");
const { createPaymentLinkSchema, listPaymentLinksSchema } = require("./paymentLinks.validation");
const { purchaseLimiter } = require("../../shared/middleware/rateLimiter");

/**
 * @swagger
 * tags:
 *   name: AdminPaymentLinks
 *   description: Admin-generated fixed-amount payment requests (Moyasar hosted invoices)
 */

/**
 * @swagger
 * /admin/payment-links/config:
 *   get:
 *     summary: Payment-link creation constraints and caller capabilities
 *     tags: [AdminPaymentLinks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Allowed expiry choices, min/max amount, capabilities }
 */
router.get("/payment-links/config", protect, requirePaymentLinksView, controller.getConfig);

/**
 * @swagger
 * /admin/payment-links:
 *   get:
 *     summary: List payment links (newest-first, server pagination)
 *     tags: [AdminPaymentLinks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches reference / description / client label
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, awaiting_payment, paid, expired, canceled, refunded, needs_review] }
 *       - in: query
 *         name: creator
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Rows + filter-scoped summary + pagination }
 */
router.get(
  "/payment-links",
  protect,
  requirePaymentLinksView,
  validateZod(listPaymentLinksSchema, "query"),
  controller.list
);

/**
 * @swagger
 * /admin/payment-links:
 *   post:
 *     summary: Create a payment link (fixed-amount SAR request)
 *     tags: [AdminPaymentLinks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amountSar]
 *             properties:
 *               amountSar: { type: string, example: "250.50" }
 *               description: { type: string, maxLength: 200 }
 *               clientLabel: { type: string, maxLength: 100 }
 *               expiresInDays: { type: integer, enum: [1, 7, 30] }
 *               locale: { type: string, enum: [ar, en] }
 *     responses:
 *       201: { description: Ready request with copyable hosted URL }
 *       202: { description: Saved creating/unknown request with ID }
 *       409: { description: Idempotency-Key reused with different input }
 */
router.post(
  "/payment-links",
  protect,
  requirePaymentLinksManage,
  purchaseLimiter,
  validateZod(createPaymentLinkSchema),
  // Durable PaymentLink creation keys replay current state, never a cached 202.
  controller.create
);

/**
 * @swagger
 * /admin/payment-links/{id}:
 *   get:
 *     summary: Payment-link detail with linked transactions
 *     tags: [AdminPaymentLinks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sanitized request detail }
 *       404: { description: Unknown record }
 */
router.get(
  "/payment-links/:id",
  protect,
  requirePaymentLinksView,
  validateObjectId("id"),
  controller.getById
);

/**
 * @swagger
 * /admin/payment-links/{id}/refresh:
 *   post:
 *     summary: Coalesced provider status check
 *     tags: [AdminPaymentLinks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current reconciled result }
 *       202: { description: Check queued/cooldown }
 */
router.post(
  "/payment-links/:id/refresh",
  protect,
  requirePaymentLinksManage,
  validateObjectId("id"),
  purchaseLimiter,
  controller.refresh
);

/**
 * @swagger
 * /admin/payment-links/{id}/cancel:
 *   post:
 *     summary: Cancel an unpaid payment link (provider-confirmed)
 *     tags: [AdminPaymentLinks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string }
 *     responses:
 *       200: { description: Canceled request }
 *       409: { description: Already paid/expired/canceled }
 */
router.post(
  "/payment-links/:id/cancel",
  protect,
  requirePaymentLinksManage,
  validateObjectId("id"),
  purchaseLimiter,
  idempotency({ scope: "payment-links.cancel" }),
  controller.cancel
);

module.exports = router;

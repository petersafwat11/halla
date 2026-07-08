const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId } = require('../../shared/middleware/validation');

// ============================================
// PAYMENT MANAGEMENT
// ============================================

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Get all payments
 *     description: |
 *       Retrieve a paginated list of payment records, with stats and pagination
 *       envelope. Optional `search`
 *       matches against host name / email / Moyasar payment id (case-insensitive).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, completed, pending, failed, refunded] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive match against host name / email / Moyasar payment id
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of payments with stats
 */
router.get('/payments',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  adminController.getPayments
);

/**
 * @swagger
 * /admin/payments/summary:
 *   get:
 *     summary: Get payment summary
 *     description: Retrieve aggregated payment statistics (totals, counts by status). Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Payment summary statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/payments/summary',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  adminController.getPaymentSummary
);

/**
 * @swagger
 * /admin/payments/export:
 *   get:
 *     summary: Export payments
 *     description: Export payment records as CSV/XLSX. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Payments export file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/payments/export',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  adminController.exportPayments
);

// `:id` route MUST come AFTER literal paths (`summary`, `export`) so
// Express does not match those against the dynamic `:id` route.
/**
 * @swagger
 * /admin/payments/{id}:
 *   get:
 *     summary: Get payment detail
 *     description: Retrieve a single payment record by ID. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Payment not found
 */
router.get('/payments/:id',
  requirePageAccess(ADMIN_PAGES.PAYMENTS, 'view'),
  validateObjectId('id'),
  adminController.getPaymentDetail
);

module.exports = router;

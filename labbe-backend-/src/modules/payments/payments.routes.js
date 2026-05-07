const express = require('express');
const router = express.Router();

const paymentsController = require('./payments.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { ROLES } = require('../../shared/constants');

// ─── Public webhook (NO `protect`) ────────────────────────────
router.post('/webhook', paymentsController.webhook);

// ─── Stub-only 3DS completion helper (dev/CI) ─────────────────
router.get('/_stub/3ds-complete', paymentsController.stubComplete3ds);

// ─── Authenticated routes ─────────────────────────────────────
router.use(protect);

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

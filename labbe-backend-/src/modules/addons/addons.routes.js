const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { auditLog } = require('../../shared/middleware/auditLog');
const { ROLES } = require('../../shared/constants');
const {
  getAvailableAddons,
  purchaseAddon,
  getMyAddons,
  adminActivateAddon,
} = require('./addons.controller');

router.get('/', getAvailableAddons);

// FLOW-10-F03: idempotency on the canonical "external side effect"
// route. The middleware was already wired in Phase 1b; reaffirmed here
// alongside the activation pipeline.
router.post(
  '/purchase',
  authenticate,
  idempotency({ scope: 'addons.purchase' }),
  purchaseAddon
);

router.get('/my', authenticate, getMyAddons);

// FLOW-10-F01: admin activation hook for business-customization
// addons. Audit-logged with the addon id so the manual provisioning
// step is traceable.
router.post(
  '/admin/:id/activate',
  authenticate,
  restrictTo(ROLES.SUPER_ADMIN),
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

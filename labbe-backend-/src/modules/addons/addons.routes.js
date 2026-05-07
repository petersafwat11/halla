const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { idempotency } = require('../../shared/middleware/idempotency');
const { auditLog } = require('../../shared/middleware/auditLog');
const { validateObjectId } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');
const {
  getAvailableAddons,
  purchaseAddon,
  getMyAddons,
  adminActivateAddon,
} = require('./addons.controller');

// Public catalog: no PII, identical for every caller. Intentionally unauthenticated
// so unsigned-in users can see pricing on the marketing surface.
router.get('/', getAvailableAddons);

router.post(
  '/purchase',
  authenticate,
  idempotency({ scope: 'addons.purchase' }),
  purchaseAddon
);

router.get('/my', authenticate, getMyAddons);

// Admin activation hook for business-customization addons. Audit-logged so the
// manual provisioning step is traceable; res.locals.addonAudit is populated by
// the controller and consumed by the auditLog middleware below.
router.post(
  '/admin/:id/activate',
  authenticate,
  restrictTo(ROLES.SUPER_ADMIN),
  validateObjectId('id'),
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

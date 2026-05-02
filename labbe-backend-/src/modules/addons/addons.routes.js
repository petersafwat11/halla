const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../../shared/middleware/auth');
const { idempotency } = require('../../shared/middleware/idempotency');
const { getAvailableAddons, purchaseAddon, getMyAddons } = require('./addons.controller');

router.get('/', getAvailableAddons);

// Phase 1b consumer: addon purchase is the canonical "produces an external
// side effect" route. Adding the idempotency guard means a flaky network
// retry can't double-bill the host.
router.post(
  '/purchase',
  authenticate,
  idempotency({ scope: 'addons.purchase' }),
  purchaseAddon
);

router.get('/my', authenticate, getMyAddons);

module.exports = router;

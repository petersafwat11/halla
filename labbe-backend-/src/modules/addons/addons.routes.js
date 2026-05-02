const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../../shared/middleware/auth');
const { getAvailableAddons, purchaseAddon, getMyAddons } = require('./addons.controller');

router.get('/', getAvailableAddons);
router.post('/purchase', authenticate, purchaseAddon);
router.get('/my', authenticate, getMyAddons);

module.exports = router;

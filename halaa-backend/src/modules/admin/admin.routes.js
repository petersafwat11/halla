/**
 * Admin Routes
 * @module modules/admin/admin.routes
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative management endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../shared/middleware/auth');

// All admin routes require authentication
router.use(protect);

router.use(require('./admin.hosts.routes'));
router.use(require('./admin.businesses.routes'));
router.use(require('./admin.vendors.routes'));
router.use(require('./admin.moderators.routes'));
router.use(require('./admin.events.routes'));
router.use(require('./admin.payments.routes'));
router.use(require('../privacy/privacy.routes'));

module.exports = router;

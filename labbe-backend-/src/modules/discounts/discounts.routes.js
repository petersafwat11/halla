/**
 * Discounts Routes
 * @module modules/discounts/discounts.routes
 */

const express = require('express');
const router = express.Router();
const discountsController = require('./discounts.controller');
const { protect } = require('../../shared/middleware/auth');
const { restrictTo } = require('../../shared/middleware/rbac');
const { filterByWhitelabel } = require('../../shared/middleware/whitelabel');
const { validateObjectId } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');

// Roles that can manage discounts
const DISCOUNT_MANAGERS = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR];

// All routes require authentication
router.use(protect);

// ============================================
// PUBLIC (any authenticated user) — validate
// ============================================

/**
 * POST /discounts/validate
 * Validate a discount code before checkout
 */
router.post(
  '/validate',
  filterByWhitelabel,
  discountsController.validate
);

// ============================================
// ADMIN-ONLY CRUD
// ============================================

/**
 * GET /discounts/admin
 * List all discount codes
 */
router.get(
  '/admin',
  restrictTo(...DISCOUNT_MANAGERS),
  filterByWhitelabel,
  discountsController.getAll
);

/**
 * POST /discounts/admin
 * Create a new discount code
 */
router.post(
  '/admin',
  restrictTo(...DISCOUNT_MANAGERS),
  filterByWhitelabel,
  discountsController.create
);

/**
 * GET /discounts/admin/:id
 * Get a single discount by ID
 */
router.get(
  '/admin/:id',
  restrictTo(...DISCOUNT_MANAGERS),
  validateObjectId('id'),
  discountsController.getById
);

/**
 * PATCH /discounts/admin/:id
 * Update a discount code
 */
router.patch(
  '/admin/:id',
  restrictTo(...DISCOUNT_MANAGERS),
  validateObjectId('id'),
  discountsController.update
);

/**
 * PATCH /discounts/admin/:id/toggle
 * Toggle active status
 */
router.patch(
  '/admin/:id/toggle',
  restrictTo(...DISCOUNT_MANAGERS),
  validateObjectId('id'),
  discountsController.toggleStatus
);

/**
 * DELETE /discounts/admin/:id
 * Delete a discount code
 */
router.delete(
  '/admin/:id',
  restrictTo(...DISCOUNT_MANAGERS),
  validateObjectId('id'),
  discountsController.delete
);

module.exports = router;

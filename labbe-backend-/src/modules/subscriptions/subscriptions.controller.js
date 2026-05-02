/**
 * Subscriptions Controller
 * HTTP request handling only - delegates to subscriptions.service
 * @module modules/subscriptions/subscriptions.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendCreated } = require('../../shared/utils/responseHelper');
const subscriptionsService = require('./subscriptions.service');

// ============================================
// SUBSCRIPTION ENDPOINTS
// ============================================

/**
 * Get current user's subscription
 * GET /api/v2/subscriptions/my-subscription
 */
exports.getMySubscription = catchAsync(async (req, res) => {
  const subscriptions = await subscriptionsService.getMySubscription(req.user._id);

  sendSuccess(res, {
    subscriptions,
    hasSubscription: subscriptions.length > 0,
    subscription: subscriptions[0] || null, // backward compat — first active sub
  });
});

/**
 * Subscribe to a plan
 * POST /api/v2/subscriptions/subscribe
 */
exports.subscribe = catchAsync(async (req, res) => {
  const { planCode, discountCode } = req.body;
  const subscription = await subscriptionsService.subscribe(req.user._id, { planCode, discountCode });

  sendCreated(res, subscription, 'Subscription created successfully');
});

/**
 * Change subscription plan
 * POST /api/v2/subscriptions/change-plan
 */
exports.changePlan = catchAsync(async (req, res) => {
  const { planCode } = req.body;
  const subscription = await subscriptionsService.changePlan(req.user._id, planCode);

  sendSuccess(res, subscription, 'Plan changed successfully');
});

/**
 * Cancel subscription
 * POST /api/v2/subscriptions/cancel
 */
exports.cancelSubscription = catchAsync(async (req, res) => {
  const { reason } = req.body;
  const subscription = await subscriptionsService.cancelSubscription(req.user._id, reason);

  sendSuccess(res, subscription, 'Subscription cancelled successfully');
});

// ============================================
// LIMIT VALIDATION ENDPOINTS
// ============================================

/**
 * Validate action against limits
 * POST /api/v2/subscriptions/validate-limits
 */
exports.validateLimits = catchAsync(async (req, res) => {
  const { action, count } = req.body;
  const validation = await subscriptionsService.validateLimits(req.user._id, action, count);

  sendSuccess(res, validation);
});

/**
 * Get package limits
 * GET /api/v2/subscriptions/limits
 */
exports.getPackageLimits = catchAsync(async (req, res) => {
  const limits = await subscriptionsService.getPackageLimits(req.user._id);

  sendSuccess(res, limits);
});

/**
 * Check feature access
 * GET /api/v2/subscriptions/features/:featureName
 */
exports.checkFeatureAccess = catchAsync(async (req, res) => {
  const { featureName } = req.params;
  const hasAccess = await subscriptionsService.canAccessFeature(req.user._id, featureName);

  sendSuccess(res, { feature: featureName, hasAccess });
});

// ============================================
// PLANS ENDPOINTS
// ============================================

/**
 * Get available plans
 * GET /api/v2/subscriptions/plans
 */
exports.getAvailablePlans = catchAsync(async (req, res) => {
  const { for: forRole } = req.query;
  const plans = await subscriptionsService.getAvailablePlans(forRole || 'host');

  sendSuccess(res, plans);
});

/**
 * Get plan by code
 * GET /api/v2/subscriptions/plans/:code
 */
exports.getPlanByCode = catchAsync(async (req, res) => {
  const plan = await subscriptionsService.getPlanByCode(req.params.code);

  sendSuccess(res, plan);
});

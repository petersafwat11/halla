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
  const { planCode, discountCode, source, callbackUrl } = req.body;
  const idempotencyKey = req.get('idempotency-key') || undefined;

  const result = await subscriptionsService.subscribe(req.user._id, {
    planCode,
    discountCode,
    source,
    callbackUrl,
    idempotencyKey,
  });

  if (result?.requiresAction) {
    // 3DS / STC OTP redirect — no resource created yet. Use 200 so the
    // client distinguishes "completed" (201) from "redirect required" (200).
    return sendSuccess(res, result, 'Payment requires additional action');
  }
  return sendCreated(res, result, 'Subscription created successfully');
});

/**
 * Admin-assign subscription to a user (FLOW-09-F04)
 * POST /api/v2/subscriptions/admin/assign
 */
exports.adminAssignSubscription = catchAsync(async (req, res) => {
  const { userId, planCode, notes } = req.body;
  const subscription = await subscriptionsService.assignSubscription(
    req.user._id,
    { userId, planCode, notes }
  );

  sendCreated(res, subscription, 'Subscription assigned successfully');
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

// ============================================
// PAYMENT HISTORY
// ============================================

/**
 * Get current user's payment history
 * GET /api/v2/subscriptions/payments
 */
exports.getMyPayments = catchAsync(async (req, res) => {
  const { page, limit, status, from, to } = req.query;
  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status: status || 'all',
    from,
    to,
  };

  const result = await subscriptionsService.getMyPayments(req.user._id, options);

  sendSuccess(res, result);
});

/**
 * Export current user's payment history as Excel
 * GET /api/v2/subscriptions/payments/export
 */
exports.exportMyPayments = catchAsync(async (req, res) => {
  const { generateExcel } = require('../../shared/utils/excelExport');
  const { status, from, to } = req.query;
  const data = await subscriptionsService.exportMyPayments(req.user._id, {
    status: status || 'all',
    from,
    to,
  });
  const buffer = generateExcel(data, 'my_payments');
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=my_payments.xlsx');
  res.send(buffer);
});

/**
 * Subscriptions Controller
 * HTTP request handling only - delegates to subscriptions.service
 * @module modules/subscriptions/subscriptions.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendCreated } = require('../../shared/utils/responseHelper');
const subscriptionsService = require('./subscriptions.service');

/**
 * Get current user's subscription
 * GET /api/v2/subscriptions/my-subscription
 */
exports.getMySubscription = catchAsync(async (req, res) => {
  const subscriptions = await subscriptionsService.getMySubscription(req.user._id);

  sendSuccess(res, {
    subscriptions,
    hasSubscription: subscriptions.length > 0,
    subscription: subscriptions[0] || null,
  });
});

/**
 * Admin-assign subscription to a user (SUPER_ADMIN only)
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

/**
 * Dashboard Controller
 * HTTP request handling for dashboard statistics
 * @module modules/dashboard/dashboard.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const dashboardService = require('./dashboard.service');

/**
 * Get admin dashboard
 * GET /api/v2/dashboard/admin
 */
exports.getAdminDashboard = catchAsync(async (req, res) => {
  const { period = 'month', from, to } = req.query;
  const dateRange = (from || to) ? { from, to } : null;
  const stats = await dashboardService.getDashboardStats(period, dateRange);
  sendSuccess(res, stats);
});

/**
 * Get host dashboard
 * GET /api/v2/dashboard/host
 */
exports.getHostDashboard = catchAsync(async (req, res) => {
  const stats = await dashboardService.getHostDashboardStats(req.user._id);
  sendSuccess(res, stats);
});

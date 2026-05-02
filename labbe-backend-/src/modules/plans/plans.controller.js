/**
 * Plans Controller
 * HTTP request handling for subscription plans
 * @module modules/plans/plans.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const plansService = require('./plans.service');

/**
 * Get all active plans
 * GET /api/v2/plans
 */
exports.getPlans = catchAsync(async (req, res) => {
  const result = await plansService.getActivePlans();
  sendSuccess(res, result);
});

/**
 * Get business plans
 * GET /api/v2/plans/business
 */
exports.getBusinessPlans = catchAsync(async (req, res) => {
  const result = await plansService.getBusinessPlans();
  sendSuccess(res, result);
});

/**
 * Get enterprise plans (backward compat alias for /business)
 * GET /api/v2/plans/enterprise
 */
exports.getEnterprisePlans = catchAsync(async (req, res) => {
  const result = await plansService.getBusinessPlans();
  sendSuccess(res, result);
});

/**
 * Get host plans (single event + monthly)
 * GET /api/v2/plans/host
 */
exports.getHostPlans = catchAsync(async (req, res) => {
  const result = await plansService.getHostPlans();
  sendSuccess(res, result);
});

/**
 * Get plan by ID
 * GET /api/v2/plans/:id
 */
exports.getPlanById = catchAsync(async (req, res) => {
  const result = await plansService.getPlanById(req.params.id);
  sendSuccess(res, result);
});

/**
 * Get plan by code
 * GET /api/v2/plans/code/:code
 */
exports.getPlanByCode = catchAsync(async (req, res) => {
  const result = await plansService.getPlanByCode(req.params.code);
  sendSuccess(res, result);
});

/**
 * Get all plans for admin (includes inactive)
 * GET /api/v2/plans/admin/all
 */
exports.getAllPlansAdmin = catchAsync(async (req, res) => {
  const result = await plansService.getAllPlansAdmin();
  sendSuccess(res, result);
});

/**
 * Update plan by code (admin)
 * PATCH /api/v2/plans/admin/:code
 */
exports.updatePlanByCode = catchAsync(async (req, res) => {
  const result = await plansService.updatePlanByCode(req.params.code, req.body);
  sendSuccess(res, result);
});

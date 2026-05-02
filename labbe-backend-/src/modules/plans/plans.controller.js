/**
 * Plans Controller
 * HTTP request handling for subscription plans
 * @module modules/plans/plans.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendCreated } = require('../../shared/utils/responseHelper');
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
 *
 * Stashes before/after on res.locals so the audit middleware (mounted
 * after the body has been processed) can pull the diff.
 */
exports.updatePlanByCode = catchAsync(async (req, res) => {
  const result = await plansService.updatePlanByCode(req.params.code, req.body);
  res.locals.planAudit = { before: result.before, after: result.after };
  sendSuccess(res, { plan: result.plan });
});

/**
 * Create plan (admin)
 * POST /api/v2/plans/admin
 */
exports.createPlan = catchAsync(async (req, res) => {
  const result = await plansService.createPlan(req.body);
  res.locals.planAudit = { before: null, after: result.plan };
  sendCreated(res, result, 'Plan created successfully');
});

/**
 * Soft-delete plan (admin)
 * DELETE /api/v2/plans/admin/:code
 */
exports.deletePlan = catchAsync(async (req, res) => {
  const result = await plansService.deletePlanByCode(req.params.code);
  res.locals.planAudit = { before: { isActive: true }, after: { isActive: false } };
  sendSuccess(res, result, 'Plan deactivated successfully');
});

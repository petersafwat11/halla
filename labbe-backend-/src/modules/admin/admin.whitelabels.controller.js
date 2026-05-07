/**
 * Admin Whitelabels Controller
 * HTTP handlers for admin whitelabel-management endpoints (Super Admin Only)
 */

const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { generateExcel } = require('../../shared/utils/excelExport');
const { getWhitelabelIdFromFilter } = require('./admin.controller.shared');

exports.getWhitelabels = catchAsync(async (req, res) => {
  const { page, limit, search, status, from, to } = req.query;

  const result = await adminService.getWhitelabels({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, from, to,
  });

  sendSuccess(res, result, 'Whitelabels retrieved successfully');
});

exports.getWhitelabelById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabel = await adminService.getWhitelabelById(id);
  sendSuccess(res, { whitelabel }, 'Whitelabel retrieved successfully');
});

exports.updateWhitelabelStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, dispatchSetupEmail } = req.body;

  const result = await adminService.updateWhitelabelStatus(id, status, {
    dispatchSetupEmail: !!dispatchSetupEmail,
    actor: req.user,
  });

  // Preserve the previous response shape (`{ whitelabel }`) so existing
  // FE consumers don't break; surface `emailDispatch` as a sibling.
  const { emailDispatch, ...whitelabel } = result;
  sendSuccess(
    res,
    { whitelabel, emailDispatch },
    'Whitelabel status updated successfully'
  );
});

exports.updateWhitelabelSubscription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { planCode, status } = req.body;

  const result = await adminService.updateWhitelabelSubscription(id, { planCode, status });
  sendSuccess(res, result, result.message);
});

exports.getWhitelabelFeatures = catchAsync(async (req, res) => {
  const { id } = req.params;
  const features = await adminService.getWhitelabelFeatures(id);
  sendSuccess(res, { features }, 'Whitelabel features retrieved successfully');
});

exports.updateWhitelabelFeature = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { feature, enabled } = req.body;

  const result = await adminService.updateWhitelabelFeature(id, feature, enabled);
  sendSuccess(res, result, 'Feature updated successfully');
});

exports.deleteWhitelabel = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deleteWhitelabel(id);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteWhitelabels = catchAsync(async (req, res) => {
  const { ids } = req.body;

  const result = await adminService.bulkDeleteWhitelabels(ids);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateWhitelabelStatus = catchAsync(async (req, res) => {
  const { ids, status } = req.body;

  const result = await adminService.bulkUpdateWhitelabelStatus(ids, status);
  sendSuccess(res, result, result.message);
});

exports.exportWhitelabels = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportWhitelabels(whitelabelId, { search, status, from, to });
  const buffer = generateExcel(data, 'whitelabels');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=whitelabels.xlsx');
  res.send(buffer);
});

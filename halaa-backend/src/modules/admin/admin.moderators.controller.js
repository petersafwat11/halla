/**
 * Admin Moderators Controller
 * HTTP handlers for admin moderator-management endpoints
 */

const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { generateExcel } = require('../../shared/utils/excelExport');

exports.getModerators = catchAsync(async (req, res) => {
  const { page, limit, search, status, from, to } = req.query;

  const result = await adminService.getModerators({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, from, to,
  });

  sendSuccess(res, result, 'Moderators retrieved successfully');
});

exports.createModerator = catchAsync(async (req, res) => {
  const { email, phoneNumber, name, password, permissions, role } = req.body;

  const moderator = await adminService.createModerator({
    email, phoneNumber, name, password, permissions, role,
    actorRole: req.user.role,
  });

  sendSuccess(res, { moderator }, 'Moderator created successfully', 201);
});

exports.updateModerator = catchAsync(async (req, res) => {
  const { id } = req.params;
  const moderator = await adminService.updateModerator(id, req.body);
  sendSuccess(res, { moderator }, 'Moderator updated successfully');
});

exports.updateModeratorStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const moderator = await adminService.updateModeratorStatus(id, status);
  sendSuccess(res, { moderator }, 'Moderator status updated successfully');
});

exports.deleteModerator = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deleteModerator(id);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteModerators = catchAsync(async (req, res) => {
  const { ids } = req.body;

  const result = await adminService.bulkDeleteModerators(ids);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateModeratorStatus = catchAsync(async (req, res) => {
  const { ids, status } = req.body;

  const result = await adminService.bulkUpdateModeratorStatus(ids, status);
  sendSuccess(res, result, result.message);
});

exports.exportModerators = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const data = await adminService.exportModerators({ search, status, from, to });
  const buffer = generateExcel(data, 'moderators');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=moderators.xlsx');
  res.send(buffer);
});

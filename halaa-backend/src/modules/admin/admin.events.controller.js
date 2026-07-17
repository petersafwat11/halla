/**
 * Admin Events Controller
 * HTTP handlers for admin event-management endpoints
 */

const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { ValidationError } = require('../../shared/errors');
const { generateExcel } = require('../../shared/utils/excelExport');
const { PLATFORM_ADMIN_ROLES } = require('../../shared/constants/roles');

exports.createEventForHost = catchAsync(async (req, res) => {
  // Parse FormData JSON fields (same pattern as events.controller.createEvent)
  let guestList = [];
  let eventData = {};

  try {
    if (req.body.guestList) guestList = JSON.parse(req.body.guestList);
    if (req.body.eventDetails) eventData.eventDetails = JSON.parse(req.body.eventDetails);
    if (req.body.staffList) eventData.staffList = JSON.parse(req.body.staffList);
    if (req.body.visualTemplate) eventData.visualTemplate = JSON.parse(req.body.visualTemplate);
    if (req.body.taqnyatTemplate) eventData.taqnyatTemplate = JSON.parse(req.body.taqnyatTemplate);
    if (req.body.guestReplies) eventData.guestReplies = JSON.parse(req.body.guestReplies);
    if (req.body.launchSettings) eventData.launchSettings = JSON.parse(req.body.launchSettings);
  } catch (error) {
    throw new ValidationError(`Invalid JSON format: ${error.message}`);
  }
  // Scalar — no JSON.parse needed.
  if (req.body.invitationType) eventData.invitationType = req.body.invitationType;

  // Resolve target user
  let targetUserId = req.body.targetUserId;
  let createForSelf = req.body.createForSelf === 'true' || req.body.createForSelf === true;
  let skipSubscriptionCheck = false;

  if (createForSelf) {
    targetUserId = req.user._id;
    // Platform admins creating for themselves have unlimited access
    if (PLATFORM_ADMIN_ROLES.includes(req.user.role)) {
      skipSubscriptionCheck = true;
    }
  } else if (req.body.phoneNumber && !targetUserId) {
    const result = await adminService.findOrCreateHost({
      phoneNumber: req.body.phoneNumber,
      name: req.body.hostName || 'Host',
    });
    targetUserId = result.host.id || result.host._id;
  }

  if (!targetUserId) throw new ValidationError('Target user is required');

  const context = {
    userId: targetUserId,
    userRole: req.user.role,
    file: req.file,
    skipSubscriptionCheck,
    adminId: req.user._id,
  };

  const result = await adminService.createEventForHost(eventData, guestList, context);
  sendSuccess(res, result, 'Event created successfully', 201);
});

exports.updateEventStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) throw new ValidationError('Status is required');

  const event = await adminService.updateEventStatus(id, status);
  sendSuccess(res, { event }, 'Event status updated successfully');
});

exports.deleteEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deleteEvent(id);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteEvents = catchAsync(async (req, res) => {
  const { ids } = req.body;

  const result = await adminService.bulkDeleteEvents(ids);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateEventStatus = catchAsync(async (req, res) => {
  const { ids, status } = req.body;

  const results = await Promise.all(
    ids.map((id) => adminService.updateEventStatus(id, status))
  );
  sendSuccess(res, { updated: results.length }, `${results.length} event(s) updated to ${status}`);
});

exports.getEventById = catchAsync(async (req, res) => {
  const result = await adminService.getEventById(req.params.id);
  sendSuccess(res, result, 'Event retrieved successfully');
});

exports.updateEventFull = catchAsync(async (req, res) => {
  let updateData = {};

  try {
    if (req.body.eventDetails) updateData.eventDetails = JSON.parse(req.body.eventDetails);
    if (req.body.guestList) updateData.guestList = JSON.parse(req.body.guestList);
    if (req.body.staffList) updateData.staffList = JSON.parse(req.body.staffList);
    if (req.body.visualTemplate) updateData.visualTemplate = JSON.parse(req.body.visualTemplate);
    if (req.body.taqnyatTemplate) updateData.taqnyatTemplate = JSON.parse(req.body.taqnyatTemplate);
    if (req.body.guestReplies) updateData.guestReplies = JSON.parse(req.body.guestReplies);
  } catch (error) {
    throw new ValidationError(`Invalid JSON format: ${error.message}`);
  }
  // Scalar — no JSON.parse needed.
  if (req.body.invitationType) updateData.invitationType = req.body.invitationType;

  const context = { adminId: req.user._id, file: req.file };
  const result = await adminService.updateEventFull(req.params.id, updateData, context);
  sendSuccess(res, result, 'Event updated successfully');
});

exports.getEventTargets = catchAsync(async (req, res) => {
  const { type } = req.query;
  const result = await adminService.getEventTargets(type, req.user);
  sendSuccess(res, result, 'Event targets retrieved successfully');
});

exports.getUserSubscriptionInfo = catchAsync(async (req, res) => {
  const result = await adminService.getUserSubscriptionInfo(req.params.id);
  sendSuccess(res, result, 'Subscription info retrieved successfully');
});

exports.exportEvents = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const data = await adminService.exportEvents({ search, status, from, to });
  const buffer = generateExcel(data, 'events');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=events.xlsx');
  res.send(buffer);
});

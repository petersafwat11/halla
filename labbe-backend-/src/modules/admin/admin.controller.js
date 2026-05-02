/**
 * Admin Controller
 * HTTP handlers for admin management endpoints
 * @module modules/admin/admin.controller
 */

const crypto = require('crypto');
const adminService = require('./admin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const { ValidationError } = require('../../shared/errors');
const { generateExcel } = require('../../shared/utils/excelExport');

/**
 * Extract whitelabel ID from middleware's req.whitelabelFilter.
 * The filterByWhitelabel middleware sets:
 *   - req.whitelabelFilter = {} for super_admin (sees everything)
 *   - req.whitelabelFilter = { whitelabelId: X } for whitelabel roles
 *   - req.whitelabelFilter = { whitelabelId: null } for platform admin/moderator
 *
 * The service layer expects:
 *   - undefined → no filter (super admin sees all)
 *   - whitelabelId value → filter to that whitelabel
 *   - null → filter to main platform only
 */
const getWhitelabelIdFromFilter = (req) => {
  const filter = req.whitelabelFilter;
  if (!filter || Object.keys(filter).length === 0) {
    return undefined; // super admin — no filter
  }
  return filter.whitelabelId; // could be an ObjectId or null
};

// ============================================
// HOST MANAGEMENT
// ============================================

exports.getHosts = catchAsync(async (req, res) => {
  const { page, limit, search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.getHosts({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, from, to, whitelabelId,
  });

  sendSuccess(res, result, 'Hosts retrieved successfully');
});

exports.getHostById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const host = await adminService.getHostById(id, whitelabelId);
  sendSuccess(res, { host }, 'Host retrieved successfully');
});

exports.createHost = catchAsync(async (req, res) => {
  const { email, phoneNumber, name, username, password } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!phoneNumber || !name) {
    throw new ValidationError('Phone number and name are required');
  }

  const host = await adminService.createHost({
    email, phoneNumber, name, username,
    password: password || crypto.randomBytes(16).toString('hex'),
    whitelabelId,
  });

  sendSuccess(res, { host }, 'Host created successfully', 201);
});

exports.updateHostStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!status) throw new ValidationError('Status is required');

  const host = await adminService.updateHostStatus(id, status, whitelabelId);
  sendSuccess(res, { host }, 'Host status updated successfully');
});

exports.updateHostSubscription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { planCode, status, billingCycle } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!planCode) throw new ValidationError('Plan code is required');

  const result = await adminService.updateHostSubscription(id, { planCode, status, billingCycle }, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.deleteHost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const result = await adminService.deleteHost(id, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteHosts = catchAsync(async (req, res) => {
  const { hostIds } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!hostIds || !Array.isArray(hostIds) || hostIds.length === 0) {
    throw new ValidationError('Host IDs array is required');
  }

  const result = await adminService.bulkDeleteHosts(hostIds, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.verifyHostByPhone = catchAsync(async (req, res) => {
  const { phoneNumber } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!phoneNumber) throw new ValidationError('Phone number is required');

  const result = await adminService.verifyHostByPhone(phoneNumber, whitelabelId);
  sendSuccess(res, result, 'Phone verification completed');
});

exports.findOrCreateHost = catchAsync(async (req, res) => {
  const { phoneNumber, name, email } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!phoneNumber || !name) {
    throw new ValidationError('Phone number and name are required');
  }

  const result = await adminService.findOrCreateHost({ phoneNumber, name, email, whitelabelId });
  const message = result.created ? 'Host created successfully' : 'Host found';
  sendSuccess(res, result, message, result.created ? 201 : 200);
});

// ============================================
// VENDOR MANAGEMENT
// ============================================

exports.getVendors = catchAsync(async (req, res) => {
  const { page, limit, search, status, category, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.getVendors({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, category, from, to, whitelabelId,
  });

  sendSuccess(res, result, 'Vendors retrieved successfully');
});

exports.getVendorById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const vendor = await adminService.getVendorById(id, whitelabelId);
  sendSuccess(res, { vendor }, 'Vendor retrieved successfully');
});

exports.updateVendorStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!status) throw new ValidationError('Status is required');

  const vendor = await adminService.updateVendorStatus(id, status, whitelabelId);
  sendSuccess(res, { vendor }, 'Vendor status updated successfully');
});

exports.updateVendorRating = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (rating === undefined) throw new ValidationError('Rating is required');

  const result = await adminService.updateVendorRating(id, rating, whitelabelId);
  sendSuccess(res, result, 'Vendor rating updated successfully');
});

exports.deleteVendor = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const result = await adminService.deleteVendor(id, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteVendors = catchAsync(async (req, res) => {
  const { vendorIds } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
    throw new ValidationError('Vendor IDs array is required');
  }

  const result = await adminService.bulkDeleteVendors(vendorIds, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateVendorStatus = catchAsync(async (req, res) => {
  const { vendorIds, status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
    throw new ValidationError('Vendor IDs array is required');
  }
  if (!status) throw new ValidationError('Status is required');

  const result = await adminService.bulkUpdateVendorStatus(vendorIds, status, whitelabelId);
  sendSuccess(res, result, result.message);
});

// ============================================
// MODERATOR MANAGEMENT
// ============================================

exports.getModerators = catchAsync(async (req, res) => {
  const { page, limit, search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.getModerators({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    search, status, from, to, whitelabelId,
  });

  sendSuccess(res, result, 'Moderators retrieved successfully');
});

exports.createModerator = catchAsync(async (req, res) => {
  const { email, phoneNumber, name, username, password, permissions, role } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!email || !phoneNumber || !name || !password) {
    throw new ValidationError('Email, phone number, name, and password are required');
  }

  const moderator = await adminService.createModerator({
    email, phoneNumber, name, username, password, permissions, whitelabelId, role,
  });

  sendSuccess(res, { moderator }, 'Moderator created successfully', 201);
});

exports.updateModerator = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const moderator = await adminService.updateModerator(id, req.body, whitelabelId);
  sendSuccess(res, { moderator }, 'Moderator updated successfully');
});

exports.updateModeratorStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!status) throw new ValidationError('Status is required');

  const moderator = await adminService.updateModeratorStatus(id, status, whitelabelId);
  sendSuccess(res, { moderator }, 'Moderator status updated successfully');
});

exports.deleteModerator = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const result = await adminService.deleteModerator(id, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteModerators = catchAsync(async (req, res) => {
  const { moderatorIds } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!moderatorIds || !Array.isArray(moderatorIds) || moderatorIds.length === 0) {
    throw new ValidationError('Moderator IDs array is required');
  }

  const result = await adminService.bulkDeleteModerators(moderatorIds, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateModeratorStatus = catchAsync(async (req, res) => {
  const { moderatorIds, status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!moderatorIds || !Array.isArray(moderatorIds) || moderatorIds.length === 0) {
    throw new ValidationError('Moderator IDs array is required');
  }
  if (!status) throw new ValidationError('Status is required');

  const result = await adminService.bulkUpdateModeratorStatus(moderatorIds, status, whitelabelId);
  sendSuccess(res, result, result.message);
});

// ============================================
// WHITELABEL MANAGEMENT (Super Admin Only)
// ============================================

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
  const { status } = req.body;

  if (!status) throw new ValidationError('Status is required');

  const whitelabel = await adminService.updateWhitelabelStatus(id, status);
  sendSuccess(res, { whitelabel }, 'Whitelabel status updated successfully');
});

exports.updateWhitelabelSubscription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { planCode, status } = req.body;

  if (!planCode) throw new ValidationError('Plan code is required');

  const result = await adminService.updateWhitelabelSubscription(id, { planCode, status });
  sendSuccess(res, result, result.message);
});

exports.deleteWhitelabel = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deleteWhitelabel(id);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteWhitelabels = catchAsync(async (req, res) => {
  const { whitelabelIds } = req.body;

  if (!whitelabelIds || !Array.isArray(whitelabelIds) || whitelabelIds.length === 0) {
    throw new ValidationError('Whitelabel IDs array is required');
  }

  const result = await adminService.bulkDeleteWhitelabels(whitelabelIds);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateWhitelabelStatus = catchAsync(async (req, res) => {
  const { whitelabelIds, status } = req.body;

  if (!whitelabelIds || !Array.isArray(whitelabelIds) || whitelabelIds.length === 0) {
    throw new ValidationError('Whitelabel IDs array is required');
  }
  if (!status) throw new ValidationError('Status is required');

  const result = await adminService.bulkUpdateWhitelabelStatus(whitelabelIds, status);
  sendSuccess(res, result, result.message);
});

// ============================================
// EVENT MANAGEMENT (ADMIN)
// ============================================

exports.createEventForHost = catchAsync(async (req, res) => {
  // Parse FormData JSON fields (same pattern as events.controller.createEvent)
  let guestList = [];
  let eventData = {};

  try {
    if (req.body.guestList) guestList = JSON.parse(req.body.guestList);
    if (req.body.eventDetails) eventData.eventDetails = JSON.parse(req.body.eventDetails);
    if (req.body.staffList) eventData.staffList = JSON.parse(req.body.staffList);
    if (req.body.invitationSettings) eventData.invitationSettings = JSON.parse(req.body.invitationSettings);
    if (req.body.launchSettings) eventData.launchSettings = JSON.parse(req.body.launchSettings);
  } catch (error) {
    throw new ValidationError(`Invalid JSON format: ${error.message}`);
  }

  // Resolve target user
  let targetUserId = req.body.targetUserId;
  const createForSelf = req.body.createForSelf === 'true' || req.body.createForSelf === true;

  if (createForSelf) {
    targetUserId = req.user._id;
  } else if (req.body.phoneNumber && !targetUserId) {
    const result = await adminService.findOrCreateHost({
      phoneNumber: req.body.phoneNumber,
      name: req.body.hostName || 'Host',
      whitelabelId: getWhitelabelIdFromFilter(req),
    });
    targetUserId = result.host.id || result.host._id;
  }

  if (!targetUserId) throw new ValidationError('Target user is required');

  // Get subscription for target user
  const Subscription = require('../../../models/SubscriptionModel');
  const subscription = await Subscription.findOne({ userId: targetUserId });

  const context = {
    userId: targetUserId,
    userRole: req.user.role,
    subscription,
    file: req.file,
    whitelabelId: req.body.whitelabelId || getWhitelabelIdFromFilter(req),
  };

  const result = await adminService.createEventForHost(eventData, guestList, context);
  sendSuccess(res, result, 'Event created successfully', 201);
});

exports.updateEventStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!status) throw new ValidationError('Status is required');

  const event = await adminService.updateEventStatus(id, status, whitelabelId);
  sendSuccess(res, { event }, 'Event status updated successfully');
});

exports.deleteEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const result = await adminService.deleteEvent(id, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkDeleteEvents = catchAsync(async (req, res) => {
  const { eventIds } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new ValidationError('Event IDs array is required');
  }

  const result = await adminService.bulkDeleteEvents(eventIds, whitelabelId);
  sendSuccess(res, result, result.message);
});

exports.bulkUpdateEventStatus = catchAsync(async (req, res) => {
  const { eventIds, status } = req.body;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new ValidationError('Event IDs array is required');
  }
  if (!status) throw new ValidationError('Status is required');

  const results = await Promise.all(
    eventIds.map((id) => adminService.updateEventStatus(id, status, whitelabelId))
  );
  sendSuccess(res, { updated: results.length }, `${results.length} event(s) updated to ${status}`);
});

exports.getEventById = catchAsync(async (req, res) => {
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const result = await adminService.getEventById(req.params.id, whitelabelId);
  sendSuccess(res, result, 'Event retrieved successfully');
});

exports.updateEventFull = catchAsync(async (req, res) => {
  let updateData = {};

  try {
    if (req.body.eventDetails) updateData.eventDetails = JSON.parse(req.body.eventDetails);
    if (req.body.guestList) updateData.guestList = JSON.parse(req.body.guestList);
    if (req.body.staffList) updateData.staffList = JSON.parse(req.body.staffList);
    if (req.body.invitationSettings) updateData.invitationSettings = JSON.parse(req.body.invitationSettings);
  } catch (error) {
    throw new ValidationError(`Invalid JSON format: ${error.message}`);
  }

  const context = { adminId: req.user._id, file: req.file, whitelabelId: getWhitelabelIdFromFilter(req) };
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

// ============================================
// PAYMENT MANAGEMENT
// ============================================

exports.getPayments = catchAsync(async (req, res) => {
  const { page, limit, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);

  const result = await adminService.getPayments({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status, from, to, whitelabelId,
  });

  sendSuccess(res, result, 'Payments retrieved successfully');
});

// ============================================
// EXPORT HANDLERS
// ============================================

exports.exportPayments = catchAsync(async (req, res) => {
  const { status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportPayments(whitelabelId, { status, from, to });
  const buffer = generateExcel(data, 'payments');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
  res.send(buffer);
});

exports.exportHosts = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportHosts(whitelabelId, { search, status, from, to });
  const buffer = generateExcel(data, 'hosts');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=hosts.xlsx');
  res.send(buffer);
});

exports.exportVendors = catchAsync(async (req, res) => {
  const { search, status, category, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportVendors(whitelabelId, { search, status, category, from, to });
  const buffer = generateExcel(data, 'vendors');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=vendors.xlsx');
  res.send(buffer);
});

exports.exportModerators = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportModerators(whitelabelId, { search, status, from, to });
  const buffer = generateExcel(data, 'moderators');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=moderators.xlsx');
  res.send(buffer);
});

exports.exportEvents = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const whitelabelId = getWhitelabelIdFromFilter(req);
  const data = await adminService.exportEvents(whitelabelId, { search, status, from, to });
  const buffer = generateExcel(data, 'events');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=events.xlsx');
  res.send(buffer);
});

exports.exportWhitelabels = catchAsync(async (req, res) => {
  const { search, status, from, to } = req.query;
  const data = await adminService.exportWhitelabels({ search, status, from, to });
  const buffer = generateExcel(data, 'whitelabels');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=whitelabels.xlsx');
  res.send(buffer);
});

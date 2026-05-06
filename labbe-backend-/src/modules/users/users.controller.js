/**
 * Users Controller
 * HTTP request handling only - delegates to users.service
 * @module modules/users/users.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendDeleted,
} = require("../../shared/utils/responseHelper");
const usersService = require("./users.service");

// ============================================
// HOST MANAGEMENT
// ============================================

/**
 * Get all hosts
 * GET /api/v2/users/hosts
 */
exports.getHosts = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };

  const result = await usersService.getHosts(
    filters,
    options,
    req.whitelabelFilter
  );

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get host by ID
 * GET /api/v2/users/hosts/:id
 */
exports.getHostById = catchAsync(async (req, res) => {
  const result = await usersService.getHostById(
    req.params.id,
    req.whitelabelFilter
  );

  sendSuccess(res, result);
});

/**
 * Create host (admin)
 * POST /api/v2/users/hosts
 */
exports.createHost = catchAsync(async (req, res) => {
  const context = {
    whitelabelId: req.currentWhitelabelId || req.user.whitelabelId,
    createdBy: req.user._id,
  };

  const result = await usersService.createHost(req.body, context);

  sendCreated(res, result, "Host created successfully");
});

/**
 * Update host status
 * PATCH /api/v2/users/hosts/:id/status
 */
exports.updateHostStatus = catchAsync(async (req, res) => {
  const result = await usersService.updateHostStatus(
    req.params.id,
    req.body.status,
    req.whitelabelFilter
  );

  sendSuccess(res, result, "Host status updated successfully");
});

/**
 * Delete host
 * DELETE /api/v2/users/hosts/:id
 */
exports.deleteHost = catchAsync(async (req, res) => {
  await usersService.deleteHost(req.params.id, req.whitelabelFilter);

  sendDeleted(res, "Host deleted successfully");
});

// ============================================
// VENDOR MANAGEMENT
// ============================================

/**
 * Get all vendors
 * GET /api/v2/users/vendors
 */
exports.getVendors = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };

  const result = await usersService.getVendors(
    filters,
    options,
    req.whitelabelFilter
  );

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get vendor by ID
 * GET /api/v2/users/vendors/:id
 */
exports.getVendorById = catchAsync(async (req, res) => {
  const result = await usersService.getVendorById(
    req.params.id,
    req.whitelabelFilter
  );

  sendSuccess(res, result);
});

/**
 * Update vendor status
 * PATCH /api/v2/users/vendors/:id/status
 */
exports.updateVendorStatus = catchAsync(async (req, res) => {
  const result = await usersService.updateVendorStatus(
    req.params.id,
    req.body,
    req.whitelabelFilter
  );

  sendSuccess(res, result, "Vendor status updated successfully");
});

// ============================================
// MODERATOR MANAGEMENT
// ============================================

/**
 * Get all moderators
 * GET /api/v2/users/moderators
 */
exports.getModerators = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 10 };
  const context = {
    userRole: req.user.role,
    whitelabelId: req.currentWhitelabelId || req.user.whitelabelId,
  };

  const result = await usersService.getModerators(filters, options, context);

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Create moderator
 * POST /api/v2/users/moderators
 */
exports.createModerator = catchAsync(async (req, res) => {
  const context = {
    userRole: req.user.role,
    whitelabelId: req.currentWhitelabelId || req.user.whitelabelId,
    // TENANT-F01: super admins must explicitly target a tenant when
    // creating an admin/moderator. Other roles inherit their own scope.
    targetWhitelabelId: req.body.whitelabelId,
    createdBy: req.user._id,
  };

  const result = await usersService.createModerator(req.body, context);

  sendCreated(res, result, "Moderator created successfully");
});

// ============================================
// USER PROFILE (Self)
// ============================================

/**
 * Get my profile
 * GET /api/v2/users/profile
 */
exports.getMyProfile = catchAsync(async (req, res) => {
  const result = await usersService.getMyProfile(req.user._id);
  sendSuccess(res, result);
});

/**
 * Update my profile
 * PATCH /api/v2/users/profile
 */
exports.updateMyProfile = catchAsync(async (req, res) => {
  // FLOW-26-F03: parse JSON-stringified fields from multipart FormData
  const body = { ...req.body };
  if (typeof body.profile === 'string') {
    try { body.profile = JSON.parse(body.profile); } catch {}
  }

  const result = await usersService.updateMyProfile(
    req.user._id,
    body,
    req.files
  );
  sendSuccess(res, result, "Profile updated successfully");
});

/**
 * Update my password
 * PATCH /api/v2/users/password
 */
exports.updateMyPassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;
  const result = await usersService.updateMyPassword(
    req.user._id,
    currentPassword,
    newPassword,
    passwordConfirm
  );
  sendSuccess(res, result, "Password updated successfully");
});

/**
 * Update my profile section
 * PATCH /api/v2/users/profile/:section
 */
exports.updateMyProfileSection = catchAsync(async (req, res) => {
  const { section } = req.params;

  // FLOW-26-F03: parse JSON-stringified fields from multipart FormData
  const body = { ...req.body };
  const jsonFields = ['serviceCategories', 'serviceLocation', 'socialLinks', 'pricePackages', 'portfolioImages'];
  for (const field of jsonFields) {
    if (typeof body[field] === 'string') {
      try { body[field] = JSON.parse(body[field]); } catch {}
    }
  }

  const result = await usersService.updateMyProfileSection(
    req.user._id,
    section,
    body,
    req.files
  );
  sendSuccess(res, result, `${section} updated successfully`);
});

/**
 * Get notification preferences
 * GET /api/v2/users/notification-preferences
 */
exports.getNotificationPreferences = catchAsync(async (req, res) => {
  const result = await usersService.getNotificationPreferences(req.user._id);
  sendSuccess(res, result);
});

/**
 * Update notification preferences
 * PATCH /api/v2/users/notification-preferences
 */
exports.updateNotificationPreferences = catchAsync(async (req, res) => {
  const result = await usersService.updateNotificationPreferences(
    req.user._id,
    req.body
  );
  sendSuccess(res, result, "Notification preferences updated");
});

// FLOW-07-F01: Request phone update (sends OTP to new phone)
exports.requestPhoneUpdate = catchAsync(async (req, res) => {
  const { newPhone } = req.body;
  const result = await usersService.requestPhoneUpdate(req.user._id, newPhone);
  sendSuccess(res, result, "OTP sent to new phone number");
});

// FLOW-07-F01: Confirm phone update with OTP
exports.confirmPhoneUpdate = catchAsync(async (req, res) => {
  const { newPhone, otp } = req.body;
  const result = await usersService.confirmPhoneUpdate(req.user._id, newPhone, otp);
  sendSuccess(res, result, "Phone number updated successfully");
});

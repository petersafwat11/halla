/**
 * Admin Moderators Service
 * Moderator management operations for the admin module.
 */

const User = require('../../../models/UserModel');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');
const { ROLES, USER_STATUS } = require('../../shared/constants');
const notificationService = require('../notifications/notifications.service');
const logger = require('../../shared/utils/logger');
const { buildSearchQuery, buildDateRangeQuery, formatUserResponse } = require('./admin.shared.service');
const { normalizePhoneNumber } = require('../../shared/utils/phone');

/**
 * Get all moderators with pagination and filters
 */
async function getModerators({ page = 1, limit = 10, search, status, from, to }) {
  const skip = (page - 1) * limit;

  // Platform moderators and admins.
  let query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] } };

  if (search) {
    const searchQuery = buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
    query = { ...query, ...searchQuery };
  }

  if (status) {
    query.status = status;
  }

  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) {
    query.createdAt = dateRange;
  }

  const [moderators, total] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    moderators: moderators.map(m => formatUserResponse(m)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Create new moderator
 */
async function createModerator({ email, phoneNumber, name, username, password, permissions, role: requestedRole, actorRole }) {
  if (actorRole !== ROLES.SUPER_ADMIN && actorRole !== ROLES.ADMIN) {
    throw new ValidationError('Not authorized to create moderators');
  }

  const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : undefined;
  const existingUser = await User.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { phoneNumber: normalizedPhone },
    ],
  });

  if (existingUser) {
    if (existingUser.email === email?.toLowerCase()) {
      throw new ConflictError('Email already exists', 'email');
    }
    if (existingUser.phoneNumber === normalizedPhone) {
      throw new ConflictError('Phone number already exists', 'phoneNumber');
    }
  }

  // Pin the role to a platform role so a tampered request body can't escalate.
  const PLATFORM_ALLOWED = [ROLES.MODERATOR, ROLES.ADMIN];
  const moderatorRole = PLATFORM_ALLOWED.includes(requestedRole) ? requestedRole : ROLES.MODERATOR;

  const moderator = await User.create({
    email: email?.toLowerCase(),
    phoneNumber: normalizedPhone,
    name,
    username: username || `moderator_${Date.now()}`,
    password,
    role: moderatorRole,
    status: USER_STATUS.ACTIVE,
    ...(Array.isArray(permissions) && permissions.length > 0 ? { permissions } : {}),
  });

  // Welcome notification to new moderator (non-blocking)
  notificationService.sendToUser(moderator._id, {
    type: 'welcome',
    title: 'Welcome to Halaa!',
    titleAr: 'مرحباً بك في هلا!',
    message: `Your moderator account has been created. You now have access to the admin dashboard.`,
    messageAr: 'تم إنشاء حساب المشرف الخاص بك. يمكنك الآن الوصول إلى لوحة التحكم.',
    data: { entityType: 'user', entityId: moderator._id },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return formatUserResponse(moderator);
}

/**
 * Update moderator
 */
async function updateModerator(moderatorId, updateData) {
  const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] } };

  const allowedUpdates = ['name', 'email', 'phoneNumber', 'permissions', 'role'];
  const updates = {};

  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  });

  // Validate role change if requested
  if (updates.role) {
    const PLATFORM_ALLOWED = [ROLES.MODERATOR, ROLES.ADMIN];
    if (!PLATFORM_ALLOWED.includes(updates.role)) delete updates.role;
  }

  if (updates.email) {
    updates.email = updates.email.toLowerCase();
  }

  const moderator = await User.findOneAndUpdate(
    query,
    updates,
    { new: true, runValidators: true }
  );

  if (!moderator) {
    throw new NotFoundError('Moderator');
  }

  return formatUserResponse(moderator);
}

/**
 * Update moderator status
 */
async function updateModeratorStatus(moderatorId, status) {
  const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] } };

  const moderator = await User.findOneAndUpdate(
    query,
    { status },
    { new: true, runValidators: true }
  );

  if (!moderator) {
    throw new NotFoundError('Moderator');
  }

  // Notify moderator of status change (non-blocking)
  notificationService.sendToUser(moderator._id, {
    type: 'account_status_change',
    title: 'Account Status Updated',
    titleAr: 'تم تحديث حالة الحساب',
    message: `Your account status has been updated to ${status}.`,
    messageAr: `تم تحديث حالة حسابك إلى ${status}.`,
    data: { entityType: 'user', entityId: moderator._id, metadata: { status } },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return formatUserResponse(moderator);
}

/**
 * Delete moderator
 */
async function deleteModerator(moderatorId) {
  const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] } };

  const moderator = await User.findOne(query);
  if (!moderator) {
    throw new NotFoundError('Moderator');
  }

  moderator.status = USER_STATUS.DELETED;
  moderator.deletedAt = new Date();
  await moderator.save();

  return { success: true, message: 'Moderator deleted successfully' };
}

/**
 * Bulk delete moderators
 */
async function bulkDeleteModerators(moderatorIds) {
  const query = {
    _id: { $in: moderatorIds },
    role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] },
  };

  const result = await User.updateMany(
    query,
    {
      status: USER_STATUS.DELETED,
      deletedAt: new Date(),
    }
  );

  return {
    success: true,
    deleted: result.modifiedCount,
    message: `${result.modifiedCount} moderator(s) deleted successfully`,
  };
}

/**
 * Bulk update moderator status
 */
async function bulkUpdateModeratorStatus(moderatorIds, status) {
  const query = {
    _id: { $in: moderatorIds },
    role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] },
  };

  const result = await User.updateMany(query, { status });

  return {
    success: true,
    updated: result.modifiedCount,
    message: `${result.modifiedCount} moderator(s) updated to ${status}`,
  };
}

/**
 * Export moderators
 */
async function exportModerators({ search, status, from, to } = {}) {
  let query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] } };
  if (search) {
    const searchQuery = buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
    query = { ...query, ...searchQuery };
  }
  if (status) query.status = status;
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

  const moderators = await User.find(query)
    .select('username name email phoneNumber role status createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return moderators.map(m => ({
    Name: m.name || m.username || '-',
    Email: m.email || '-',
    Phone: m.phoneNumber || '-',
    Role: m.role || '-',
    Status: m.status || '-',
    'Created At': m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : '-',
  }));
}

module.exports = {
  getModerators,
  createModerator,
  updateModerator,
  updateModeratorStatus,
  deleteModerator,
  bulkDeleteModerators,
  bulkUpdateModeratorStatus,
  exportModerators,
};

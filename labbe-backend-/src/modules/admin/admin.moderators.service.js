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

/**
 * Get all moderators with pagination and filters
 */
async function getModerators({ page = 1, limit = 10, search, status, from, to, whitelabelId }) {
  const skip = (page - 1) * limit;

  // Tenant-isolated query:
  // - Whitelabel users see only their own whitelabel_moderators/whitelabel_admins
  // - Platform users (super_admin, admin, moderator — all have whitelabelId: null)
  //   see only platform moderators/admins (no whitelabelId)
  let query = {};
  if (whitelabelId !== undefined && whitelabelId !== null) {
    // Whitelabel user — only their whitelabel_moderators and whitelabel_admins
    query = { role: { $in: [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN] }, whitelabelId };
  } else if (whitelabelId === null) {
    // Platform admin/super_admin — only platform moderators and admins
    query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] }, whitelabelId: null };
  } else {
    // Fallback (whitelabelId === undefined): safety net, should not occur after middleware fix
    query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] }, whitelabelId: null };
  }

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
async function createModerator({ email, phoneNumber, name, username, password, permissions, role: requestedRole, actorRole, bodyWhitelabelId, filterWhitelabelId }) {
  let whitelabelId;
  if (actorRole === ROLES.SUPER_ADMIN) {
    whitelabelId = bodyWhitelabelId;
    if (!whitelabelId) {
      throw new ValidationError('whitelabelId is required when a super admin creates an admin or moderator');
    }
  } else {
    whitelabelId = filterWhitelabelId;
    if (!whitelabelId) {
      throw new ValidationError('Creator has no whitelabel scope; cannot create moderator');
    }
  }
  const existingUser = await User.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { phoneNumber },
    ],
  });

  if (existingUser) {
    if (existingUser.email === email?.toLowerCase()) {
      throw new ConflictError('Email already exists', 'email');
    }
    if (existingUser.phoneNumber === phoneNumber) {
      throw new ConflictError('Phone number already exists', 'phoneNumber');
    }
  }

  // Determine the correct role. Both branches require a whitelabelId.
  // - Whitelabel-creator path (called by WHITELABEL_ADMIN): whitelabel-only roles.
  // - Platform-creator path (called by SUPER_ADMIN): platform-admin roles, but
  //   still tenant-bound via the supplied whitelabelId.
  const WHITELABEL_ALLOWED = [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN];
  const PLATFORM_ALLOWED = [ROLES.MODERATOR, ROLES.ADMIN];

  let moderatorRole;
  if (WHITELABEL_ALLOWED.includes(requestedRole)) {
    moderatorRole = requestedRole;
  } else if (PLATFORM_ALLOWED.includes(requestedRole)) {
    moderatorRole = requestedRole;
  } else {
    moderatorRole = ROLES.MODERATOR;
  }

  const moderator = await User.create({
    email: email?.toLowerCase(),
    phoneNumber,
    name,
    username: username || `moderator_${Date.now()}`,
    password,
    role: moderatorRole,
    status: USER_STATUS.ACTIVE,
    whitelabelId,
    ...(Array.isArray(permissions) && permissions.length > 0 ? { permissions } : {}),
  });

  // Welcome notification to new moderator (non-blocking)
  notificationService.sendToUser(moderator._id, {
    type: 'welcome',
    title: 'Welcome to Labbe!',
    titleAr: 'مرحباً بك في لبّي!',
    message: `Your moderator account has been created. You now have access to the admin dashboard.`,
    messageAr: 'تم إنشاء حساب المشرف الخاص بك. يمكنك الآن الوصول إلى لوحة التحكم.',
    data: { entityType: 'user', entityId: moderator._id },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return formatUserResponse(moderator);
}

/**
 * Update moderator
 */
async function updateModerator(moderatorId, updateData, whitelabelId) {
  const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const allowedUpdates = ['name', 'email', 'phoneNumber', 'permissions', 'role'];
  const updates = {};

  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  });

  // Validate role change if requested
  if (updates.role) {
    const WHITELABEL_ALLOWED = [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN];
    const PLATFORM_ALLOWED = [ROLES.MODERATOR, ROLES.ADMIN];
    if (whitelabelId !== undefined && whitelabelId !== null) {
      if (!WHITELABEL_ALLOWED.includes(updates.role)) delete updates.role;
    } else {
      if (!PLATFORM_ALLOWED.includes(updates.role)) delete updates.role;
    }
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
async function updateModeratorStatus(moderatorId, status, whitelabelId) {
  const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

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
async function deleteModerator(moderatorId, whitelabelId) {
  const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

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
async function bulkDeleteModerators(moderatorIds, whitelabelId) {
  const query = {
    _id: { $in: moderatorIds },
    role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] },
  };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

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
async function bulkUpdateModeratorStatus(moderatorIds, status, whitelabelId) {
  const query = { _id: { $in: moderatorIds } };

  if (whitelabelId !== undefined && whitelabelId !== null) {
    // Whitelabel user — only their whitelabel moderators
    query.role = { $in: [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN] };
    query.whitelabelId = whitelabelId;
  } else if (whitelabelId === null) {
    // Platform admin/super_admin — only platform moderators (no whitelabelId)
    query.role = { $in: [ROLES.MODERATOR, ROLES.ADMIN] };
    query.whitelabelId = null;
  } else {
    // No filter set (should not happen after middleware fix, kept as safety net)
    query.role = { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] };
  }

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
async function exportModerators(whitelabelId, { search, status, from, to } = {}) {
  let query = { role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
  if (whitelabelId !== undefined && whitelabelId !== null) {
    query = { role: { $in: [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN] }, whitelabelId };
  } else if (whitelabelId === null) {
    query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] }, whitelabelId: null };
  }
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

/**
 * Admin Businesses Service
 *
 * Full management of business accounts (role:host + accountType:'business').
 * Segregated from personal hosts via businessHostFilter (IDOR both ways).
 *
 * @module modules/admin/admin.businesses.service
 */

const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../../../models/UserModel');
const Event = require('../../../models/EventModel');
const RefreshToken = require('../../../models/RefreshTokenModel');
const BusinessPlanAssignment = require('../../../models/BusinessPlanAssignmentModel');
const { ASSIGNMENT_STATUS } = require('../../../models/BusinessPlanAssignmentModel');
const BusinessSetupFee = require('../../../models/BusinessSetupFeeModel');

const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');
const { ROLES, USER_STATUS, ACCOUNT_TYPES } = require('../../shared/constants');
const { businessHostFilter } = require('../../shared/utils/accountScope');
const { buildSearchQuery, buildDateRangeQuery, formatUserResponse } = require('./admin.shared.service');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
const { deleteFromS3, signStoredImage } = require('../../shared/utils/s3Upload');
const notificationService = require('../notifications/notifications.service');
const assignmentService = require('../business/business.assignment.service');
const setupFeeService = require('../business/business.setupFee.service');
const logger = require('../../shared/utils/logger');

const safeDeleteOldKey = async (oldKey) => {
  if (!oldKey) return;
  try {
    await deleteFromS3(oldKey);
  } catch (err) {
    logger.warn('[admin.businesses] failed to delete old S3 key', { oldKey, error: err?.message });
  }
};

/** List businesses (paginated, segregated). */
async function getBusinesses({ page = 1, limit = 10, search, status, from, to }) {
  const skip = (page - 1) * limit;
  let query = businessHostFilter();

  if (search) {
    query = { ...query, ...buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']) };
  }
  if (status) query.status = status;
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

  const baseQuery = businessHostFilter();

  const [businesses, total, statusCounts] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken -__v')
      .populate({
        path: 'subscription',
        select: 'status expiresAt planId',
        populate: { path: 'planId', select: 'nameAr nameEn code planType billingType' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
    User.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = {};
  statusCounts.forEach((s) => { counts[s._id] = s.count; });

  return {
    businesses: businesses.map((b) => formatUserResponse(b)),
    statusCounts: {
      active: counts.active || 0,
      suspended: counts.suspended || 0,
      inactive: counts.inactive || 0,
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/** Get a single business with subscription, events summary, assignments, setup-fee. */
async function getBusinessById(businessId) {
  const business = await User.findOne(businessHostFilter({ _id: businessId }))
    .select('-password -passwordResetToken')
    .populate({
      path: 'subscription',
      select: 'status expiresAt invitePool compensationPool invitesConsumed planId',
      populate: { path: 'planId', select: 'nameAr nameEn code planType billingType limits' },
    })
    .lean();

  if (!business) throw new NotFoundError('Business');

  const [eventCount, assignments, setupFee] = await Promise.all([
    Event.countDocuments({ host: businessId }),
    assignmentService.listForBusiness(businessId),
    BusinessSetupFee.findOne({ businessUserId: businessId }).lean(),
  ]);

  const formatted = formatUserResponse(business);
  formatted.avatarUrl = await signStoredImage(business.avatar);

  return {
    ...formatted,
    statistics: { totalEvents: eventCount },
    assignments: assignments.map(formatAssignment),
    setupFee: setupFee
      ? { status: setupFee.status, settled: setupFee.settled, amount: setupFee.amount }
      : { status: 'pending', settled: false, amount: 1200 },
  };
}

function formatAssignment(a) {
  return {
    id: a._id,
    mode: a.mode,
    status: a.status,
    planCode: a.planCode,
    total: a.totalSnapshot,
    setupFee: a.setupFeeSnapshot,
    currency: a.currency,
    expiresAt: a.expiresAt,
    usedAt: a.usedAt,
    createdAt: a.createdAt,
    deliveryAttempts: a.deliveryAttempts,
  };
}

/**
 * Create a business account. Identity prechecks are backed by DB uniqueness.
 * No trial subscription (admin-assigned only until activation). [#13]
 */
async function createBusiness({ name, email, phoneNumber, password, description, logoKey }) {
  const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : undefined;
  const existingUser = await User.findOne({
    $or: [
      ...(email ? [{ email: email.toLowerCase() }] : []),
      ...(normalizedPhone ? [{ phoneNumber: normalizedPhone }, { mobile: normalizedPhone }] : []),
    ],
  });
  if (existingUser) {
    if (email && existingUser.email === email.toLowerCase()) {
      throw new ConflictError('Email already exists', 'email');
    }
    throw new ConflictError('Phone number already exists', 'phoneNumber');
  }

  if (!password) throw new ValidationError('An initial password is required for a business account');

  let business;
  try {
    business = await User.create({
      email: email?.toLowerCase(),
      phoneNumber: normalizedPhone,
      mobile: normalizedPhone,
      name,
      username: `business_${Date.now()}`,
      password,
      avatar: logoKey || undefined,
      role: ROLES.HOST,
      accountType: ACCOUNT_TYPES.BUSINESS,
      mustChangePassword: true,
      status: USER_STATUS.ACTIVE,
      profile: {
        hostData: { profileCompleted: true, emailVerified: false },
        businessData: { description: description || '' },
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError('A user with this email or phone already exists');
    }
    throw err;
  }

  // Initialize the setup-fee entitlement record (pending).
  await setupFeeService.getOrCreate(business._id).catch((e) =>
    logger.warn('[admin.businesses] setup-fee init failed', { error: e?.message })
  );

  notificationService
    .sendToUser(business._id, {
      type: 'welcome',
      title: 'Welcome to Halaa Business!',
      titleAr: 'مرحباً بك في هلا أعمال!',
      message: 'Your business account has been created. We recommend updating your password from Settings after your first login.',
      messageAr: 'تم إنشاء حساب منشأتك. يرجى تغيير كلمة المرور عند أول تسجيل دخول.',
      data: { entityType: 'user', entityId: business._id },
    })
    .catch(() => {});

  return formatUserResponse(business);
}

/** Update editable business profile fields. */
async function updateBusiness(businessId, { name, description }) {
  const business = await User.findOne(businessHostFilter({ _id: businessId }));
  if (!business) throw new NotFoundError('Business');

  if (name !== undefined) business.name = name;
  if (description !== undefined) {
    business.profile = business.profile || {};
    business.profile.businessData = business.profile.businessData || {};
    business.profile.businessData.description = description;
  }
  await business.save();
  return formatUserResponse(business);
}

/** Replace the business logo (S3 key) and clean up the old object. [#9] */
async function updateBusinessLogo(businessId, logoKey) {
  if (!logoKey) throw new ValidationError('No logo uploaded');
  const business = await User.findOne(businessHostFilter({ _id: businessId }));
  if (!business) throw new NotFoundError('Business');

  const oldKey = business.avatar;
  business.avatar = logoKey;
  await business.save();
  await safeDeleteOldKey(oldKey);

  return { avatar: await signStoredImage(logoKey) };
}

/** Assign a plan — mode A (grant) or mode B (checkout link). */
async function assignPlan(businessId, { mode, planCode, discountCode, grantReason }, actorId) {
  await assertBusiness(businessId);
  if (mode === 'grant') {
    const { assignment, subscription } = await assignmentService.assignGrant({
      businessUserId: businessId,
      planCode,
      grantReason,
      createdBy: actorId,
    });
    return { mode: 'grant', assignment: formatAssignment(assignment), subscriptionId: subscription?._id };
  }
  if (mode === 'checkout') {
    const { assignment, link } = await assignmentService.assignCheckout({
      businessUserId: businessId,
      planCode,
      discountCode,
      createdBy: actorId,
    });
    // Admin gets the link to copy (delivery already attempted server-side).
    return { mode: 'checkout', assignment: formatAssignment(assignment), link };
  }
  throw new ValidationError('mode must be "grant" or "checkout"');
}

async function revokeAssignment(assignmentId, actorId) {
  const a = await assignmentService.revoke(assignmentId, actorId);
  return formatAssignment(a);
}

async function regenerateAssignment(assignmentId, actorId) {
  const { assignment, link } = await assignmentService.regenerate(assignmentId, actorId);
  return { assignment: formatAssignment(assignment), link };
}

/** Suspend: revoke sessions + open checkout links; preserve data/sub. [#12] */
async function suspendBusiness(businessId, actorId) {
  const business = await assertBusiness(businessId);
  business.status = USER_STATUS.SUSPENDED;
  await business.save();
  await RefreshToken.updateMany(
    { userId: businessId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  await cancelOpenLinks(businessId);
  return formatUserResponse(business);
}

/** Reactivate: status active; do NOT auto-revive expired links. [#12] */
async function activateBusiness(businessId) {
  const business = await assertBusiness(businessId);
  business.status = USER_STATUS.ACTIVE;
  await business.save();
  return formatUserResponse(business);
}

/** Soft-delete: revoke links/sessions; retain financial/event history. [#12] */
async function deleteBusiness(businessId, actorId) {
  const business = await assertBusiness(businessId);
  // Canonical soft-delete: status INACTIVE + deletedAt (matches UserModel
  // softDelete; there is no USER_STATUS.DELETED). Financial/event history
  // is retained.
  business.status = USER_STATUS.INACTIVE;
  business.deletedAt = new Date();
  business.deletedBy = actorId;
  await business.save();
  await RefreshToken.updateMany(
    { userId: businessId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  await cancelOpenLinks(businessId);
  return { success: true, message: 'Business deleted successfully' };
}

async function cancelOpenLinks(businessId) {
  const open = await BusinessPlanAssignment.find({
    businessUserId: businessId,
    status: ASSIGNMENT_STATUS.PENDING_PAYMENT,
  }).select('_id version');
  for (const a of open) {
    await BusinessPlanAssignment.transition(
      a._id,
      ASSIGNMENT_STATUS.PENDING_PAYMENT,
      a.version,
      ASSIGNMENT_STATUS.CANCELLED,
      { failureCode: 'business_lifecycle', completedAt: new Date() }
    );
  }
}

async function assertBusiness(businessId) {
  const business = await User.findOne(businessHostFilter({ _id: businessId }));
  if (!business) throw new NotFoundError('Business');
  return business;
}

module.exports = {
  getBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  updateBusinessLogo,
  assignPlan,
  revokeAssignment,
  regenerateAssignment,
  suspendBusiness,
  activateBusiness,
  deleteBusiness,
};

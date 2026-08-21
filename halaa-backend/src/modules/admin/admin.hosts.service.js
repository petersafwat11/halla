/**
 * Admin Hosts Service
 * Host management operations for the admin module.
 */

const User = require('../../../models/UserModel');
const Event = require('../../../models/EventModel');
const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');
const Guest = require('../../../models/GuestModel');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');
const {
  ROLES,
  USER_STATUS,
  EVENT_STATUS,
  SUBSCRIPTION_STATUS,
  ACCOUNT_TYPES,
  COMPENSATION_PERCENTAGE,
} = require('../../shared/constants');
const mongoose = require('mongoose');
const notificationService = require('../notifications/notifications.service');
const logger = require('../../shared/utils/logger');
const { buildSearchQuery, buildDateRangeQuery, formatUserResponse } = require('./admin.shared.service');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
const { personalHostFilter } = require('../../shared/utils/accountScope');
const subscriptionLifecycle = require('../subscriptions/subscriptionLifecycle.service');

/**
 * Get all hosts with pagination and filters
 */
async function getHosts({ page = 1, limit = 10, search, status, from, to }) {
  const skip = (page - 1) * limit;

  let query = personalHostFilter();

  // Search filter
  if (search) {
    const searchQuery = buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
    query = { ...query, ...searchQuery };
  }

  // Status filter
  if (status) {
    query.status = status;
  }

  // Date range filter
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) {
    query.createdAt = dateRange;
  }

  const baseQuery = personalHostFilter();

  const [hosts, total, statusCounts] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken -__v')
      .populate({
        path: 'subscription',
        select: 'status activatedAt expiresAt invitePool compensationPool invitesConsumed planId',
        populate: { path: 'planId', select: 'features limits name nameAr nameEn code planType' },
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
  statusCounts.forEach(s => { counts[s._id] = s.count; });

  return {
    hosts: hosts.map(h => formatUserResponse(h)),
    statusCounts: {
      active: counts.active || 0,
      pending: counts.pending || 0,
      suspended: counts.suspended || 0,
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get host by ID
 */
async function getHostById(hostId) {
  const query = personalHostFilter({ _id: hostId });

  const host = await User.findOne(query)
    .select('-password -passwordResetToken')
    .populate({
      path: 'subscription',
      select: 'status activatedAt expiresAt invitePool compensationPool invitesConsumed planId',
      populate: { path: 'planId', select: 'features limits name nameAr nameEn code planType' },
    })
    .lean();

  if (!host) {
    throw new NotFoundError('Host');
  }

  // Get host events and statistics
  const [events, eventCount, activeEvents] = await Promise.all([
    Event.find({ host: hostId })
      .select('eventDetails status guestList')
      .sort({ createdAt: -1 })
      .lean(),
    Event.countDocuments({ host: hostId }),
    Event.countDocuments({ host: hostId, status: EVENT_STATUS.PUBLISHED }),
  ]);

  // Get RSVP counts per event
  const eventIds = events.map(e => e._id);
  const rsvpCounts = eventIds.length > 0
    ? await Guest.aggregate([
      { $match: { event: { $in: eventIds } } },
      { $group: { _id: { event: '$event', status: '$status' }, count: { $sum: 1 } } },
    ])
    : [];

  const rsvpMap = {};
  rsvpCounts.forEach(r => {
    const eid = r._id.event.toString();
    if (!rsvpMap[eid]) rsvpMap[eid] = {};
    rsvpMap[eid][r._id.status] = r.count;
  });

  const formattedEvents = events.map(e => {
    const counts = rsvpMap[e._id.toString()] || {};
    return {
      id: e._id,
      title: e.eventDetails?.title || e.eventDetails?.eventName,
      date: e.eventDetails?.date,
      time: e.eventDetails?.time,
      location: e.eventDetails?.location,
      status: e.status,
      guestListLength: e.guestList?.length || 0,
      totalConfirmed: counts.confirmed || 0,
      totalDeclined: counts.declined || 0,
      totalPending: counts.invited || 0,
    };
  });

  return {
    ...formatUserResponse(host),
    events: formattedEvents,
    statistics: {
      totalEvents: eventCount,
      activeEvents,
    },
  };
}

/**
 * Create new host
 */
async function createHost({ email, phoneNumber, name, username, password }) {
  // Check for duplicates
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

  // Create host
  const effectivePassword = password || require('crypto').randomBytes(16).toString('hex');
  const host = await User.create({
    email: email?.toLowerCase(),
    phoneNumber: normalizedPhone,
    mobile: normalizedPhone,
    name,
    username: username || `host_${Date.now()}`,
    password: effectivePassword,
    role: ROLES.HOST,
    accountType: ACCOUNT_TYPES.PERSONAL,
    status: USER_STATUS.ACTIVE,
    profile: {
      hostData: {
        profileCompleted: true,
        emailVerified: false,
      },
    },
  });

  // Use the canonical factory so current entitlement and expiry fields are set.
  // The old startDate/currentPeriodEnd fields are not in the Subscription schema.
  const trialPlan = await Plan.findOne({ code: 'trial' });
  if (trialPlan) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const activatedAt = new Date();
        const invitePool = trialPlan.limits?.invitePool ?? null;
        const [subscription] = await Subscription.create([{
          userId: host._id,
          planId: trialPlan._id,
          status: SUBSCRIPTION_STATUS.TRIAL,
          activatedAt,
          // Preserve the existing 30-day policy for admin-created hosts.
          expiresAt: new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
          invitePool,
          compensationPool: invitePool === null
            ? null
            : Math.floor(invitePool * COMPENSATION_PERCENTAGE / 100),
          invitesConsumed: 0,
        }], { session });
        await User.findByIdAndUpdate(host._id, { subscription: subscription._id }, { session });
      });
    } finally {
      session.endSession();
    }
  }

  // Welcome notification to new host (non-blocking)
  notificationService.sendToUser(host._id, {
    type: 'welcome',
    title: 'Welcome to Halaa!',
    titleAr: 'مرحباً بك في هلا!',
    message: 'Your host account has been created successfully. Start creating events!',
    messageAr: 'تم إنشاء حساب المضيف بنجاح. ابدأ في إنشاء المناسبات!',
    data: { entityType: 'user', entityId: host._id },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return formatUserResponse(host);
}

/**
 * Update host status
 */
async function updateHostStatus(hostId, status) {
  const query = personalHostFilter({ _id: hostId });

  const host = await User.findOneAndUpdate(
    query,
    { status },
    { new: true, runValidators: true }
  );

  if (!host) {
    throw new NotFoundError('Host');
  }

  // Notify host of status change (non-blocking)
  notificationService.sendToUser(host._id, {
    type: 'account_status_change',
    title: 'Account Status Updated',
    titleAr: 'تم تحديث حالة الحساب',
    message: `Your account status has been updated to ${status}.`,
    messageAr: `تم تحديث حالة حسابك إلى ${status}.`,
    data: { entityType: 'user', entityId: host._id, metadata: { status } },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return formatUserResponse(host);
}

/**
 * Update host subscription
 */
async function updateHostSubscription(hostId, { planCode, actorId, reason }) {
  const query = personalHostFilter({ _id: hostId });

  const host = await User.findOne(query);
  if (!host) {
    throw new NotFoundError('Host');
  }

  const { subscription } = await subscriptionLifecycle.changePlan(hostId, planCode, {
    actor: { _id: actorId, role: ROLES.ADMIN, onBehalfOf: true },
    reason: reason || 'admin_host_plan_change',
    pricePaid: 0,
    status: planCode === 'trial' ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
    cancelReason: `Replaced by admin host plan ${planCode}`,
  });

  // Notify host of subscription update (non-blocking)
  notificationService.sendToUser(hostId, {
    type: 'subscription_updated',
    title: 'Subscription Updated',
    titleAr: 'تم تحديث الاشتراك',
    message: `Your subscription has been updated to the ${planCode} plan.`,
    messageAr: `تم تحديث اشتراكك إلى باقة ${planCode}.`,
    data: { entityType: 'subscription', metadata: { planCode } },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return {
    success: true,
    message: 'Subscription updated successfully',
    subscriptionId: subscription._id,
  };
}

async function grantHostExtraInvites(hostId, { quantity, reason, actorId }) {
  const host = await User.findOne(personalHostFilter({ _id: hostId }));
  if (!host) {
    throw new NotFoundError('Host');
  }

  const result = await subscriptionLifecycle.grantExtraInvites(
    { userId: hostId },
    quantity,
    {
      actor: { _id: actorId, role: ROLES.ADMIN },
      reason: reason || 'admin_host_extra_invites',
    }
  );

  notificationService.sendToUser(hostId, {
    type: 'subscription_updated',
    title: 'Extra Invites Added',
    titleAr: 'تمت إضافة دعوات إضافية',
    message: `${quantity} extra invites were added to your plan.`,
    messageAr: `تمت إضافة ${quantity} دعوة إضافية إلى باقتك.`,
    data: {
      entityType: 'subscription',
      entityId: result.subscription?._id,
      metadata: { quantity },
    },
  }).catch((err) => logger.error('admin.service extra invite notify failed', err));

  return {
    success: true,
    message: 'Extra invites granted successfully',
    subscription: result.subscription?.getSummary
      ? result.subscription.getSummary()
      : result.subscription,
    addonId: result.addon._id,
  };
}

/**
 * Delete host
 */
async function deleteHost(hostId) {
  const query = personalHostFilter({ _id: hostId });

  const host = await User.findOne(query);
  if (!host) {
    throw new NotFoundError('Host');
  }

  // Check if host has active events
  const activeEvents = await Event.countDocuments({ host: hostId, status: EVENT_STATUS.PUBLISHED });
  if (activeEvents > 0) {
    throw new ValidationError('Cannot delete host with active events');
  }

  // Soft delete
  host.status = USER_STATUS.DELETED;
  host.deletedAt = new Date();
  await host.save();

  return { success: true, message: 'Host deleted successfully' };
}

/**
 * Bulk delete hosts
 */
async function bulkDeleteHosts(hostIds) {
  const uniqueIds = Array.from(new Set((hostIds || []).map(String)));
  const succeeded = [];
  const failed = [];

  for (const id of uniqueIds) {
    try {
      const query = personalHostFilter({ _id: id });
      const host = await User.findOne(query);
      if (!host) {
        throw new NotFoundError('Host');
      }

      const activeEvents = await Event.countDocuments({
        host: id,
        status: { $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.LIVE, EVENT_STATUS.SCHEDULED, 'live', 'scheduled', 'published'] },
      });
      if (activeEvents > 0) {
        throw new ValidationError('Cannot delete host with active events');
      }

      host.status = USER_STATUS.DELETED;
      host.deletedAt = new Date();
      await host.save();
      succeeded.push(id.toString());
    } catch (err) {
      failed.push({
        id: id.toString(),
        error: err.message || 'Failed to delete host',
      });
    }
  }

  return {
    success: true,
    count: succeeded.length,
    deleted: succeeded.length,
    deletedCount: succeeded.length,
    succeeded,
    failed,
    message: `${succeeded.length} host(s) deleted successfully`,
  };
}

/**
 * Verify host by phone number
 */
async function verifyHostByPhone(phoneNumber) {
  const query = { phoneNumber, role: ROLES.HOST };

  const host = await User.findOne(query).select('_id username name email phoneNumber status').lean();

  return {
    exists: !!host,
    host: host ? formatUserResponse(host) : null,
  };
}

/**
 * Find or create host
 */
async function findOrCreateHost({ phoneNumber, name, email }) {
  const query = { phoneNumber, role: ROLES.HOST };

  let host = await User.findOne(query);

  if (host) {
    return {
      host: formatUserResponse(host),
      created: false,
    };
  }

  // Create new host
  host = await createHost({
    phoneNumber,
    name,
    email,
    username: `host_${Date.now()}`,
    password: require('crypto').randomBytes(16).toString('hex'), // Secure random password
  });

  return {
    host,
    created: true,
  };
}

/**
 * Export hosts
 */
async function exportHosts({ search, status, from, to } = {}) {
  let query = personalHostFilter();
  if (search) {
    const searchQuery = buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
    query = { ...query, ...searchQuery };
  }
  if (status) query.status = status;
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

  const hosts = await User.find(query)
    .select('username name email phoneNumber status createdAt')
    .populate({ path: 'subscription', select: 'planType status' })
    .sort({ createdAt: -1 })
    .lean();

  return hosts.map(h => ({
    Name: h.name || h.username || '-',
    Email: h.email || '-',
    Phone: h.phoneNumber || '-',
    Status: h.status || '-',
    Subscription: h.subscription?.planType || '-',
    'Created At': h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '-',
  }));
}

module.exports = {
  getHosts,
  getHostById,
  createHost,
  updateHostStatus,
  updateHostSubscription,
  grantHostExtraInvites,
  deleteHost,
  bulkDeleteHosts,
  verifyHostByPhone,
  findOrCreateHost,
  exportHosts,
};

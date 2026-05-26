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
const AppError = require('../../shared/errors/AppError');
const { ROLES, USER_STATUS, EVENT_STATUS, SUBSCRIPTION_STATUS } = require('../../shared/constants');
const mongoose = require('mongoose');
const notificationService = require('../notifications/notifications.service');
const logger = require('../../shared/utils/logger');
const { buildSearchQuery, buildDateRangeQuery, formatUserResponse } = require('./admin.shared.service');

/**
 * Get all hosts with pagination and filters
 */
async function getHosts({ page = 1, limit = 10, search, status, from, to, whitelabelId }) {
  const skip = (page - 1) * limit;

  let query = { role: ROLES.HOST };

  // Whitelabel filter
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

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

  const baseQuery = { role: ROLES.HOST };
  if (whitelabelId !== undefined) baseQuery.whitelabelId = whitelabelId;

  const [hosts, total, statusCounts] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken -__v')
      .populate({
        path: 'subscription',
        select: 'status endDate planId billingCycle',
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
async function getHostById(hostId, whitelabelId) {
  const query = { _id: hostId, role: ROLES.HOST };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const host = await User.findOne(query)
    .select('-password -passwordResetToken')
    .populate({
      path: 'subscription',
      select: 'status endDate planId billingCycle',
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
      totalPending: (counts.invited || 0) + (counts.maybe || 0),
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
async function createHost({ email, phoneNumber, name, username, password, whitelabelId }) {
  // Check for duplicates
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

  if (whitelabelId) {
    const whitelabelAdmin = await User.findById(whitelabelId).lean();
    if (whitelabelAdmin?.subscription) {
      const sub = await Subscription.findById(whitelabelAdmin.subscription).populate('planId');
      if (sub?.planId?.limits?.maxHosts != null) {
        const maxHosts = sub.planId.limits.maxHosts;
        if (maxHosts > 0) {
          const currentHostCount = await User.countDocuments({
            role: ROLES.HOST,
            whitelabelId,
          });
          if (currentHostCount >= maxHosts) {
            const { HOST_LIMIT_EXCEEDED } = require('../../shared/constants/events');
            const err = new AppError(
              `Cannot create host: whitelabel has reached its plan limit of ${maxHosts} host(s).`,
              422,
              HOST_LIMIT_EXCEEDED
            );
            err.details = { currentHostCount, maxHosts, whitelabelId };
            throw err;
          }
        }
      }
    }
  }

  // Create host
  const host = await User.create({
    email: email?.toLowerCase(),
    phoneNumber,
    name,
    username: username || `host_${Date.now()}`,
    password,
    role: ROLES.HOST,
    status: USER_STATUS.ACTIVE,
    whitelabelId: whitelabelId || null,
    profile: {
      hostData: {
        profileCompleted: true,
        emailVerified: false,
      },
    },
  });

  // Create trial subscription and link to user atomically
  const trialPlan = await Plan.findOne({ code: 'trial' });
  if (trialPlan) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const [subscription] = await Subscription.create([{
          userId: host._id,
          planId: trialPlan._id,
          planType: 'trial',
          status: 'trial',
          startDate: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    title: 'Welcome to Halla!',
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
async function updateHostStatus(hostId, status, whitelabelId) {
  const query = { _id: hostId, role: ROLES.HOST };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

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
async function updateHostSubscription(hostId, { planCode, status: subscriptionStatus }, whitelabelId) {
  const query = { _id: hostId, role: ROLES.HOST };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const host = await User.findOne(query);
  if (!host) {
    throw new NotFoundError('Host');
  }

  const plan = await Plan.findOne({ code: planCode });
  if (!plan) {
    throw new NotFoundError('Plan');
  }

  const activeSubs = await Subscription.findActiveForUser(hostId);
  const subscription = activeSubs[0] || null;

  if (!subscription) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const [newSub] = await Subscription.create([{
          userId: hostId,
          planId: plan._id,
          status: subscriptionStatus || SUBSCRIPTION_STATUS.ACTIVE,
          startDate: new Date(),
        }], { session });
        await User.findByIdAndUpdate(hostId, { subscription: newSub._id }, { session });
      });
    } finally {
      session.endSession();
    }
  } else {
    // Update existing subscription
    subscription.planId = plan._id;
    if (subscriptionStatus) {
      subscription.status = subscriptionStatus;
    }

    await subscription.save();
  }

  // Notify host of subscription update (non-blocking)
  notificationService.sendToUser(hostId, {
    type: 'subscription_updated',
    title: 'Subscription Updated',
    titleAr: 'تم تحديث الاشتراك',
    message: `Your subscription has been updated to the ${planCode} plan.`,
    messageAr: `تم تحديث اشتراكك إلى باقة ${planCode}.`,
    data: { entityType: 'subscription', metadata: { planCode } },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return { success: true, message: 'Subscription updated successfully' };
}

/**
 * Delete host
 */
async function deleteHost(hostId, whitelabelId) {
  const query = { _id: hostId, role: ROLES.HOST };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

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
async function bulkDeleteHosts(hostIds, whitelabelId) {
  const query = {
    _id: { $in: hostIds },
    role: ROLES.HOST,
  };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  // Check for active events
  const hostsWithActiveEvents = await Event.distinct('host', {
    host: { $in: hostIds },
    status: EVENT_STATUS.PUBLISHED,
  });

  if (hostsWithActiveEvents.length > 0) {
    throw new ValidationError(`Cannot delete ${hostsWithActiveEvents.length} host(s) with active events`);
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
    message: `${result.modifiedCount} host(s) deleted successfully`,
  };
}

/**
 * Verify host by phone number
 */
async function verifyHostByPhone(phoneNumber, whitelabelId) {
  const query = { phoneNumber, role: ROLES.HOST };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const host = await User.findOne(query).select('_id username name email phoneNumber status').lean();

  return {
    exists: !!host,
    host: host ? formatUserResponse(host) : null,
  };
}

/**
 * Find or create host
 */
async function findOrCreateHost({ phoneNumber, name, email, whitelabelId }) {
  const query = { phoneNumber, role: ROLES.HOST };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

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
    whitelabelId,
  });

  return {
    host,
    created: true,
  };
}

/**
 * Export hosts
 */
async function exportHosts(whitelabelId, { search, status, from, to } = {}) {
  let query = { role: ROLES.HOST };
  if (whitelabelId !== undefined) query.whitelabelId = whitelabelId;
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
  deleteHost,
  bulkDeleteHosts,
  verifyHostByPhone,
  findOrCreateHost,
  exportHosts,
};

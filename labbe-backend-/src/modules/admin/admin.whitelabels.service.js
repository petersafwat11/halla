/**
 * Admin Whitelabels Service
 * Whitelabel management operations for the admin module.
 */

const User = require('../../../models/UserModel');
const Event = require('../../../models/EventModel');
const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { ROLES, USER_STATUS, SUBSCRIPTION_STATUS } = require('../../shared/constants');
const notificationService = require('../notifications/notifications.service');
const config = require('../../config');
const email = require('../../../email');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { guardExportMaxRows } = require('../../shared/utils/excelExport');
const { buildSearchQuery, buildDateRangeQuery, formatUserResponse } = require('./admin.shared.service');

/**
 * Get all whitelabels with pagination and filters
 */
async function getWhitelabels({ page = 1, limit = 10, search, status, from, to }) {
  const skip = (page - 1) * limit;

  let query = { role: ROLES.WHITELABEL_ADMIN };

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

  const [whitelabels, total, hostCountAgg] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken')
      .populate('subscription', 'planType status currentPeriodEnd')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
    User.aggregate([
      { $match: { role: ROLES.HOST } },
      { $group: { _id: '$whitelabelId', count: { $sum: 1 } } },
    ]),
  ]);

  const hostCountMap = Object.fromEntries(
    hostCountAgg.map(({ _id, count }) => [String(_id), count])
  );

  const whitelabelsWithStats = whitelabels.map((wl) => ({
    ...formatUserResponse(wl),
    hostCount: hostCountMap[String(wl._id)] || 0,
  }));

  return {
    whitelabels: whitelabelsWithStats,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get whitelabel by ID
 */
async function getWhitelabelById(whitelabelId) {
  const whitelabel = await User.findOne({
    _id: whitelabelId,
    role: ROLES.WHITELABEL_ADMIN,
  })
    .select('-password -passwordResetToken')
    .populate('subscription', 'planType status currentPeriodEnd planId')
    .lean();

  if (!whitelabel) {
    throw new NotFoundError('Whitelabel');
  }

  const [hostCount, eventCount, recentHosts] = await Promise.all([
    User.countDocuments({ whitelabelId, role: ROLES.HOST }),
    Event.countDocuments({ whitelabelId }),
    User.find({ whitelabelId, role: ROLES.HOST })
      .select('username name email phoneNumber status createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return {
    ...formatUserResponse(whitelabel),
    planSelection: whitelabel.planSelection || null,
    statistics: {
      totalHosts: hostCount,
      totalEvents: eventCount,
      hostsCount: hostCount,
      eventsCount: eventCount,
      moderatorsCount: await User.countDocuments({ whitelabelId, role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } }),
    },
    recentHosts: recentHosts.map(h => ({
      id: h._id,
      name: h.name || h.username,
      username: h.username,
      email: h.email,
      phoneNumber: h.phoneNumber,
      status: h.status,
      createdAt: h.createdAt,
    })),
  };
}

/**
 * Update whitelabel status.
 *
 * When `{ status: 'active', dispatchSetupEmail: true }` is sent, a fresh
 * setup-password token is minted and the `whitelabelApproval` email is
 * dispatched. Re-approval regenerates the token, invalidating the prior link.
 *
 * Token + status are persisted in a single `whitelabel.save()`. Email
 * failures write a `partial` audit row but do not roll back the status
 * flip — the platform is still approved either way.
 *
 * @param {string} whitelabelId
 * @param {string} status - one of USER_STATUS values
 * @param {Object} [opts]
 * @param {boolean} [opts.dispatchSetupEmail=false] — when true and
 *        status is 'active', mint a setup token and send the email.
 * @param {Object} [opts.actor] — req.user (for audit log)
 * @returns {Promise<Object>}
 */
async function updateWhitelabelStatus(whitelabelId, status, opts = {}) {
  const { dispatchSetupEmail = false, actor = null } = opts;

  const whitelabel = await User.findOne({
    _id: whitelabelId,
    role: ROLES.WHITELABEL_ADMIN,
  });

  if (!whitelabel) {
    throw new NotFoundError('Whitelabel');
  }

  const previousStatus = whitelabel.status;
  whitelabel.status = status;

  let setupToken = null;
  let emailSkipReason = null;
  if (dispatchSetupEmail && status === USER_STATUS.ACTIVE) {
    // Defense in depth: never blast `email.send.whitelabelApproval(null,
    // …)` — nodemailer would throw / silently send to a null address.
    // Surface a clean partial-success state instead so the admin can
    // back-fill the email manually.
    if (!whitelabel.email) {
      emailSkipReason = 'NO_EMAIL_ON_FILE';
    } else if (
      // B-R1 hardening (post-review) — close the re-approval password
      // reset trapdoor. Once the WL has completed setup
      // (`passwordChangedAt` set + no pending setup token), an admin
      // re-clicking Approve must NOT mint a new token + email. The
      // explicit password-reset flow (forgot-password / admin reset)
      // is the right tool for that case. Without this gate, any admin
      // could effectively force-reset any WL admin's password by
      // re-toggling Approve.
      whitelabel.passwordChangedAt && !whitelabel.passwordSetupToken
    ) {
      emailSkipReason = 'PASSWORD_ALREADY_SET';
    } else {
      // Mint a fresh token. createPasswordSetupToken() hashes onto the
      // user document and returns the plain token; we save below.
      setupToken = whitelabel.createPasswordSetupToken();
    }
  }

  // Single save persists status change + (optional) setup token hash.
  await whitelabel.save({ validateBeforeSave: false });

  // Notify whitelabel of status change (non-blocking, in-app). Skip
  // when the status didn't actually move — re-approval already
  // triggers an email + token regeneration, the in-app duplicate
  // would just be noise.
  if (previousStatus !== status) {
    notificationService.sendToUser(whitelabel._id, {
      type: 'account_status_change',
      title: 'Account Status Updated',
      titleAr: 'تم تحديث حالة الحساب',
      message: `Your platform account status has been updated to ${status}.`,
      messageAr: `تم تحديث حالة حساب منصتك إلى ${status}.`,
      data: { entityType: 'user', entityId: whitelabel._id, metadata: { status } },
    }).catch((err) => logger.error('admin.service notify failed', err));
  }

  let emailDispatch = { sent: false, attempted: false };
  if (emailSkipReason) {
    emailDispatch.attempted = true;
    emailDispatch.error = emailSkipReason;
  } else if (setupToken) {
    emailDispatch.attempted = true;
    try {
      const frontendUrl = config?.frontend?.url || '';
      // Arabic-first path; the FE redirects to the correct dashboard after setup.
      const setupPasswordUrl = `${frontendUrl}/ar/setup-password/${setupToken}`;
      // Whitelabel admins navigate the platform admin tree at /admin-dash;
      // there is no dedicated /whitelabel route space (verified in
      // services/serverAuth.js ROLE_PAGE_ACCESS). The dashboardUrl is
      // only rendered in the email when no setupPasswordUrl is present
      // (mutually exclusive in the template), but we point it at the
      // right destination anyway so a future template change can't
      // 404.
      const dashboardUrl = `${frontendUrl}/ar/admin-dash`;
      await email.send.whitelabelApproval(
        whitelabel.email,
        {
          platformName:
            whitelabel.platformName || whitelabel.username || whitelabel.email,
          email: whitelabel.email,
          setupPasswordUrl,
          dashboardUrl,
        },
        'ar'
      );
      emailDispatch.sent = true;
    } catch (err) {
      logger.error('admin.updateWhitelabelStatus email send failed', { whitelabelId, err: err?.message || err });
      emailDispatch.error = err?.message || String(err);
    }
  }

  // Audit log the status update + email dispatch outcome.
  try {
    await logAudit({
      action: 'whitelabel.status_update',
      actor,
      targetType: 'whitelabel',
      targetId: whitelabel._id,
      whitelabelId: whitelabel._id,
      metadata: {
        previousStatus,
        newStatus: status,
        dispatchSetupEmail,
        emailDispatch,
      },
      status: emailDispatch.attempted && !emailDispatch.sent ? 'partial' : 'success',
    });
  } catch (auditErr) {
    // eslint-disable-next-line no-console
    console.warn('[admin.updateWhitelabelStatus] audit log failed:', auditErr?.message);
  }

  return {
    ...formatUserResponse(whitelabel),
    emailDispatch,
  };
}

/**
 * Update whitelabel subscription
 */
async function updateWhitelabelSubscription(whitelabelId, { planCode, status: subscriptionStatus }) {
  const whitelabel = await User.findOne({
    _id: whitelabelId,
    role: ROLES.WHITELABEL_ADMIN,
  });

  if (!whitelabel) {
    throw new NotFoundError('Whitelabel');
  }

  const plan = await Plan.findOne({ code: planCode });
  if (!plan) {
    throw new NotFoundError('Plan');
  }

  const activeWlSubs = await Subscription.findActiveForUser(whitelabelId);
  const subscription = activeWlSubs[0] || null;

  if (!subscription) {
    const newSub = await Subscription.create({
      userId: whitelabelId,
      planId: plan._id,
      planType: planCode,
      status: subscriptionStatus || SUBSCRIPTION_STATUS.ACTIVE,
      startDate: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    await User.findByIdAndUpdate(whitelabelId, { subscription: newSub._id });
  } else {
    subscription.planId = plan._id;
    subscription.planType = planCode;
    if (subscriptionStatus) {
      subscription.status = subscriptionStatus;
    }
    await subscription.save();
  }

  // Notify whitelabel of subscription update (non-blocking)
  notificationService.sendToUser(whitelabelId, {
    type: 'subscription_updated',
    title: 'Subscription Updated',
    titleAr: 'تم تحديث الاشتراك',
    message: `Your platform subscription has been updated to the ${planCode} plan.`,
    messageAr: `تم تحديث اشتراك منصتك إلى باقة ${planCode}.`,
    data: { entityType: 'subscription', metadata: { planCode } },
  }).catch((err) => logger.error('admin.service notify failed', err));

  return { success: true, message: 'Subscription updated successfully' };
}

/**
 * Get whitelabel features
 */
async function getWhitelabelFeatures(whitelabelId) {
  const whitelabel = await User.findOne({
    _id: whitelabelId,
    role: ROLES.WHITELABEL_ADMIN,
  }).lean();

  if (!whitelabel) {
    throw new NotFoundError('Whitelabel');
  }

  const storedFeatures = whitelabel.features || {};

  // Canonical feature definitions
  const FEATURE_DEFINITIONS = [
    { name: 'whatsappMessaging', label: 'WhatsApp Messaging', description: 'Send WhatsApp messages to guests' },
    { name: 'customDomain', label: 'Custom Domain', description: 'Use a custom domain for the whitelabel platform' },
    { name: 'advancedAnalytics', label: 'Advanced Analytics', description: 'Access detailed analytics and reports' },
    { name: 'apiAccess', label: 'API Access', description: 'Access the platform API programmatically' },
    { name: 'whiteLabelBranding', label: 'White-label Branding', description: 'Remove platform branding and use custom branding' },
    { name: 'prioritySupport', label: 'Priority Support', description: 'Get priority customer support' },
  ];

  return FEATURE_DEFINITIONS.map((def) => ({
    ...def,
    enabled: storedFeatures[def.name] === true,
  }));
}

/**
 * Update a single whitelabel feature toggle
 */
async function updateWhitelabelFeature(whitelabelId, featureName, enabled) {
  const whitelabel = await User.findOne({
    _id: whitelabelId,
    role: ROLES.WHITELABEL_ADMIN,
  });

  if (!whitelabel) {
    throw new NotFoundError('Whitelabel');
  }

  whitelabel.features = whitelabel.features || {};
  whitelabel.features[featureName] = enabled;
  await whitelabel.save();

  return {
    success: true,
    feature: featureName,
    enabled,
  };
}

/**
 * Delete whitelabel
 */
async function deleteWhitelabel(whitelabelId) {
  const whitelabel = await User.findOne({
    _id: whitelabelId,
    role: ROLES.WHITELABEL_ADMIN,
  });

  if (!whitelabel) {
    throw new NotFoundError('Whitelabel');
  }

  const hostCount = await User.countDocuments({
    whitelabelId,
    role: ROLES.HOST,
  });

  if (hostCount > 0) {
    throw new ValidationError(`Cannot delete whitelabel with ${hostCount} host(s)`);
  }

  whitelabel.status = USER_STATUS.DELETED;
  whitelabel.deletedAt = new Date();
  await whitelabel.save();

  return { success: true, message: 'Whitelabel deleted successfully' };
}

/**
 * Bulk delete whitelabels
 */
async function bulkDeleteWhitelabels(whitelabelIds) {
  const hostCount = await User.countDocuments({
    whitelabelId: { $in: whitelabelIds },
    role: ROLES.HOST,
  });

  if (hostCount > 0) {
    throw new ValidationError(`Cannot delete whitelabels with ${hostCount} host(s)`);
  }

  const result = await User.updateMany(
    {
      _id: { $in: whitelabelIds },
      role: ROLES.WHITELABEL_ADMIN,
    },
    {
      status: USER_STATUS.DELETED,
      deletedAt: new Date(),
    }
  );

  return {
    success: true,
    deleted: result.modifiedCount,
    message: `${result.modifiedCount} whitelabel(s) deleted successfully`,
  };
}

/**
 * Bulk update whitelabel status (e.g. bulk suspend)
 */
async function bulkUpdateWhitelabelStatus(whitelabelIds, status) {
  const result = await User.updateMany(
    { _id: { $in: whitelabelIds }, role: ROLES.WHITELABEL_ADMIN },
    { status }
  );

  return {
    success: true,
    updated: result.modifiedCount,
    message: `${result.modifiedCount} whitelabel(s) updated to ${status}`,
  };
}

/**
 * Export whitelabels
 */
async function exportWhitelabels(whitelabelId, { search, status, from, to } = {}) {
  let query = { role: ROLES.WHITELABEL_ADMIN };
  if (whitelabelId !== undefined) query.whitelabelId = whitelabelId;
  if (search) {
    const searchQuery = buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
    query = { ...query, ...searchQuery };
  }
  if (status) query.status = status;
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

  // enforce export row cap
  const count = await User.countDocuments(query);
  guardExportMaxRows(count, 'whitelabels');

  const whitelabels = await User.find(query)
    .select('username name email phoneNumber status createdAt')
    .populate('subscription', 'planType status')
    .sort({ createdAt: -1 })
    .lean();

  return whitelabels.map(wl => ({
    Name: wl.name || wl.username || '-',
    Email: wl.email || '-',
    Phone: wl.phoneNumber || '-',
    Status: wl.status || '-',
    Subscription: wl.subscription?.planType || '-',
    'Created At': wl.createdAt ? new Date(wl.createdAt).toISOString().split('T')[0] : '-',
  }));
}

module.exports = {
  getWhitelabels,
  getWhitelabelById,
  updateWhitelabelStatus,
  updateWhitelabelSubscription,
  getWhitelabelFeatures,
  updateWhitelabelFeature,
  deleteWhitelabel,
  bulkDeleteWhitelabels,
  bulkUpdateWhitelabelStatus,
  exportWhitelabels,
};

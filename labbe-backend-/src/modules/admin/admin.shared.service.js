/**
 * Admin Shared Service
 * Private helpers and cross-area utilities.
 * All functions are exported as plain named functions.
 */

const User = require('../../../models/UserModel');
const Subscription = require('../../../models/SubscriptionModel');
const { NotFoundError } = require('../../shared/errors');
const { ROLES } = require('../../shared/constants');

/**
 * Build search query for users
 */
function buildSearchQuery(searchValue, fields) {
  if (!searchValue) return {};
  const escaped = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchRegex = { $regex: escaped, $options: 'i' };
  return {
    $or: fields.map(field => ({ [field]: searchRegex })),
  };
}

/**
 * Build date range query
 */
function buildDateRangeQuery(from, to) {
  if (!from && !to) return {};
  const query = {};
  if (from) query.$gte = new Date(from);
  if (to) query.$lte = new Date(to);
  return query;
}

/**
 * Format user response
 */
function formatUserResponse(user) {
  const base = {
    id: user._id,
    username: user.username,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    accountType: user.accountType || null,
    status: user.status,
    profileCompleted: user.profile?.hostData?.profileCompleted || user.profile?.vendorData?.profileCompleted,
    emailVerified: user.profile?.hostData?.emailVerified || user.emailVerified || false,
    subscription: user.subscription ? {
      planType: user.subscription.planId?.planType || user.subscription.planType,
      planId: user.subscription.planId,
      status: user.subscription.status,
      currentPeriodEnd: user.subscription.expiresAt || user.subscription.endDate || user.subscription.currentPeriodEnd,
      billingType: user.subscription.planId?.billingType || null,
      invitePool: user.subscription.invitePool ?? null,
      compensationPool: user.subscription.compensationPool ?? null,
      invitesConsumed: user.subscription.invitesConsumed || 0,
      invitesRemaining:
        user.subscription.invitePool === null || user.subscription.invitePool === undefined
          ? null
          : (user.subscription.invitePool || 0)
            + (user.subscription.compensationPool || 0)
            - (user.subscription.invitesConsumed || 0),
      limits: {
        maxEvents: user.subscription.planId?.limits?.maxEvents ?? null,
        maxInvitesPerEvent: user.subscription.planId?.limits?.maxInvitesPerEvent ?? null,
        invitePool: user.subscription.planId?.limits?.invitePool ?? null,
      },
    } : null,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };

  // Vendor-specific fields
  if (user.role === ROLES.VENDOR) {
    const vd = user.profile?.vendorData;
    base.brandName = vd?.brandName || null;
    base.vendorStatus = vd?.vendorStatus || null;
    base.rating = vd?.rating ?? null;
    base.ratingComment = vd?.ratingComment || null;
    base.serviceCategories = vd?.serviceCategories || null;
  }

  // Business-account fields (role:host + accountType:'business')
  if (user.accountType === 'business') {
    base.businessData = {
      description: user.profile?.businessData?.description || null,
    };
    base.avatar = user.avatar || null;
    base.mustChangePassword = !!user.mustChangePassword;
  }

  return base;
}

/**
 * Normalize subscription data for event-target cards.
 * Returns a consistent shape regardless of plan type.
 */
function formatTargetSubscription(sub) {
  const limits = sub.planId?.limits || {};
  const planType = sub.planId?.planType;
  const isPerEvent = planType ? require('../../shared/constants/plans').isPerEventPlan(planType) : false;
  const isPool = planType ? require('../../shared/constants/plans').isPoolPlan(planType) : false;

  let guestLimit, isGuestUnlimited, invitePool, invitesRemaining;
  if (isPerEvent) {
    guestLimit = limits.maxInvitesPerEvent ?? 50;
    isGuestUnlimited = guestLimit === -1;
    invitePool = null;
    invitesRemaining = null;
  } else if (isPool) {
    guestLimit = -1;
    isGuestUnlimited = true;
    invitePool = sub.invitePool ?? null;
    const totalPool = (sub.invitePool || 0) + (sub.compensationPool || 0);
    invitesRemaining = totalPool - (sub.invitesConsumed || 0);
  } else {
    guestLimit = limits.maxInvitesPerEvent ?? 50;
    isGuestUnlimited = guestLimit === -1;
    invitePool = sub.invitePool ?? null;
    invitesRemaining = sub.invitesRemaining ?? null;
  }

  // Plan schema field is `maxEvents` (-1 = unlimited / pool, 1 = per-event).
  const maxEvents = limits.maxEvents ?? (isPerEvent ? 1 : -1);
  const eventsUsed = sub.usage?.eventsCreated || 0;
  const eventsRemaining = isPerEvent
    ? Math.max(0, 1 - eventsUsed)
    : maxEvents === -1 ? -1 : Math.max(0, maxEvents - eventsUsed);

  return {
    status: sub.status,
    planType: sub.planType,
    planCode: sub.planId?.code || null,
    isSingleEvent: isPerEvent,
    isPoolPlan: isPool,
    guestLimit,
    isGuestUnlimited,
    invitePool,
    invitesRemaining,
    eventsRemaining,
    eventsUsed,
  };
}

/**
 * Map subscription status to payment status for display
 */
function mapSubStatusToPayment(subscriptionStatus) {
  switch (subscriptionStatus) {
    case 'active':
    case 'completed':
      return 'completed';
    case 'trial':
      return 'pending';
    case 'cancelled':
    case 'expired':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Get user subscription info
 */
async function getUserSubscriptionInfo(userId) {
  const user = await User.findById(userId).select('role name').lean();
  if (!user) throw new NotFoundError('User');

  const activeSubs = await Subscription.findActiveForUser(userId);
  let subscription = activeSubs[0] || null;

  if (!subscription) {
    return { subscription: null };
  }

  return {
    subscription: formatTargetSubscription(subscription),
  };
}

module.exports = {
  buildSearchQuery,
  buildDateRangeQuery,
  formatUserResponse,
  formatTargetSubscription,
  mapSubStatusToPayment,
  getUserSubscriptionInfo,
};

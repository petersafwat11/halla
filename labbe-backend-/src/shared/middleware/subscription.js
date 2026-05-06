/**
 * Subscription Middleware
 * Handles feature gating based on user subscription plans
 */

const catchAsync = require("../utils/catchAsync");
const AppError = require("../errors/AppError");
const {
  ROLES,
  SUBSCRIPTION_STATUS,
  PLAN_TYPES,
} = require("../constants");
const { isUnlimited, isPerEventPlan } = require("../constants/plans");
const { isAdminRole } = require("../constants/roles");

const Subscription = require("../../../models/SubscriptionModel");

/**
 * Require active subscription
 * Blocks access if user doesn't have an active subscription
 */
exports.requireSubscription = catchAsync(async (req, res, next) => {
  const isPlatformAdmin =
    isAdminRole(req.user?.role) && !req.user?.whitelabelId;
  const isCreatingForSelf =
    !req.body.targetUserId && !req.body.hostId && !req.body.phoneNumber;

  if (isPlatformAdmin && isCreatingForSelf) {
    req.isUnlimitedAdmin = true;
    return next();
  }

  if (req.user?.role === ROLES.SUPER_ADMIN) {
    return next();
  }

  const user = req.user;

  if (!user) {
    return next(new AppError("Please log in to access this resource", 401));
  }

  if ([ROLES.GUEST, ROLES.VENDOR].includes(user.role)) {
    return next();
  }

  const userId = user._id || user.id;
  const subscriptions = await Subscription.findActiveForUser(userId);

  if (!subscriptions || subscriptions.length === 0) {
    return res.status(403).json({ success: false, message: 'No active subscription found' });
  }

  req.subscriptions = subscriptions;
  req.subscription = subscriptions[0];

  const subscription = subscriptions[0];

  if (
    subscription.expiresAt &&
    new Date(subscription.expiresAt) < new Date()
  ) {
    return next(
      new AppError("Your subscription period has ended. Please renew", 402)
    );
  }

  if (isPerEventPlan(subscription.planType)) {
    if (subscription.status === SUBSCRIPTION_STATUS.COMPLETED) {
      return next(
        new AppError(
          "Your event plan has been used. Please purchase a new plan",
          402
        )
      );
    }
  }

  // Attach package info (non-critical, best-effort)
  try {
    req.package = {
      code: subscription.planId?.code,
      planType: subscription.planId?.planType,
      features: subscription.planId?.features || {},
      usage: subscription.usage,
      status: subscription.status,
    };
  } catch (error) {
    req.package = null;
  }

  next();
});

/**
 * Check event creation limit
 * Verifies user hasn't exceeded event limit based on plan type
 */
exports.checkEventLimit = catchAsync(async (req, res, next) => {
  const isPlatformAdmin = isAdminRole(req.user?.role) && !req.user?.whitelabelId;
  if (isPlatformAdmin) {
    return next();
  }

  const subscription = req.subscription;

  if (!subscription) {
    return next(new AppError("Subscription required to create events", 402));
  }

  const canCreate = subscription.canCreateEvent();

  if (!canCreate.allowed) {
    return next(new AppError(canCreate.reason, 402));
  }

  // Check event limit based on activatedAt (billingCycle field removed)
  const plan = subscription.planId;
  const maxEvents = plan?.limits?.maxEvents;

  // unlimited or pool plan → no event limit
  if (!maxEvents || maxEvents === -1) {
    req.remainingEvents = subscription.eventsRemaining;
    return next();
  }

  // per-event plan: check how many events created since activatedAt
  const Event = require("../../../models/EventModel");
  const periodStart = subscription.activatedAt || subscription.createdAt;
  const eventCount = await Event.countDocuments({
    host: req.user._id,
    createdAt: { $gte: periodStart },
    status: { $nin: ['cancelled', 'draft'] },
  });

  if (eventCount >= maxEvents) {
    return res.status(403).json({
      success: false,
      message: 'Event limit reached for your current subscription',
      code: 'EVENT_LIMIT_REACHED',
    });
  }

  req.remainingEvents = subscription.eventsRemaining;
  next();
});

/**
 * Check guest limit for an event
 * @param {Function|number} getGuestCount - Function to get guest count or static number
 */
exports.checkGuestLimit = (getGuestCount) => {
  return catchAsync(async (req, res, next) => {
    // Only platform admins bypass — whitelabel moderators must respect limits (Bug 9)
    const isPlatformAdmin = isAdminRole(req.user?.role) && !req.user?.whitelabelId;
    if (isPlatformAdmin) {
      return next();
    }

    let guestCount;
    if (typeof getGuestCount === "function") {
      guestCount = await getGuestCount(req);
    } else if (typeof getGuestCount === "number") {
      guestCount = getGuestCount;
    } else {
      guestCount =
        req.body.guestList?.length ||
        req.body.guests?.length ||
        (req.body.guest ? 1 : 0);
    }

    const userId = req.user._id || req.user.id;
    const capacitySub = await Subscription.getCapacityForEvent(userId, guestCount);
    if (!capacitySub) {
      return res.status(403).json({ success: false, message: 'No active subscription with sufficient capacity' });
    }
    req.capacitySubscription = capacitySub;
    next();
  });
};

/**
 * Check follow-up messages limit
 */
exports.checkMessageLimit = catchAsync(async (req, res, next) => {
  if (isAdminRole(req.user?.role)) {
    return next();
  }

  const subscription = req.subscription;

  if (!subscription) {
    return next(new AppError("Subscription required", 402));
  }

  const maxMessages = subscription.limits?.maxFollowUpMessages;

  if (maxMessages === undefined || maxMessages === null || isUnlimited(maxMessages)) {
    return next();
  }

  const currentMessages = req.event?.followUpMessagesSent || 0;

  if (currentMessages >= maxMessages) {
    return next(
      new AppError(
        `You have used all ${maxMessages} follow-up messages for this event`,
        402
      )
    );
  }

  req.remainingMessages = maxMessages - currentMessages;
  next();
});

/**
 * Increment event usage counter
 * Call this after successfully creating an event
 */
exports.incrementEventUsage = catchAsync(async (req, res, next) => {
  if (isAdminRole(req.user?.role)) {
    return next();
  }

  const subscription = req.subscription;

  if (subscription) {
    const maxEvents = subscription.limits?.maxEvents;
    const query = { _id: subscription._id };

    // For plans with a finite cap, atomically guard against overshooting.
    if (maxEvents && !isUnlimited(maxEvents)) {
      query['usage.eventsCreated'] = { $lt: maxEvents };
    }

    const result = await Subscription.findOneAndUpdate(
      query,
      { $inc: { "usage.eventsCreated": 1 } },
      { new: true }
    );

    if (!result && maxEvents && !isUnlimited(maxEvents)) {
      return next(new AppError("Event limit reached", 402));
    }
  }

  next();
});

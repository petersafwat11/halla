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
const { countsAgainstPlanStatusFilter } = require("../constants/events");

const Subscription = require("../../../models/SubscriptionModel");
const Event = require("../../../models/EventModel");

/**
 * Require active subscription
 * Blocks access if user doesn't have an active subscription
 */
exports.requireSubscription = catchAsync(async (req, res, next) => {
  const isPlatformAdmin = isAdminRole(req.user?.role);
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
  const isPlatformAdmin = isAdminRole(req.user?.role);
  if (isPlatformAdmin) {
    return next();
  }

  const subscription = req.subscription;

  if (!subscription) {
    return next(new AppError("Subscription required to create events", 402));
  }

  // canCreateEvent() encodes the static gate: for per-event plans it blocks
  // when invitesConsumed > 0 (sending happened → permanently used). Pool /
  // unlimited plans always pass here (their cap is the invite pool).
  const canCreate = subscription.canCreateEvent();

  if (!canCreate.allowed) {
    return next(new AppError(canCreate.reason, 402));
  }

  const plan = subscription.planId;
  const maxEvents = plan?.limits?.maxEvents;
  const Event = require("../../../models/EventModel");

  // unlimited or pool plan → no event-count limit (cap is the invite pool).
  if (!maxEvents || maxEvents === -1) {
    req.remainingEvents = subscription.eventsRemaining;
    return next();
  }

  // per-event plan: in addition to the invitesConsumed gate above, block when
  // an event is currently active under this subscription. Active = status NOT
  // IN ['cancelled','deleted'] (the unified "counts against the plan" filter),
  // scoped to this subscription — no date bound. Combined with the
  // invitesConsumed check, a per-event host can only re-create after
  // cancel/delete if nothing was ever sent.
  const activeEventCount = await Event.countDocuments({
    subscriptionId: subscription._id,
    ...countsAgainstPlanStatusFilter(),
  });

  if (activeEventCount >= maxEvents) {
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
    // Only platform admins bypass subscription limits
    const isPlatformAdmin = isAdminRole(req.user?.role);
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
    // Updates belong to the subscription already consumed by the event. A
    // per-event/trial subscription is intentionally absent from
    // getCapacityForEvent after creation, so asking for a fresh subscription
    // incorrectly rejects edits to that same event.
    let capacitySub = null;
    if (req.params?.id) {
      const event = await Event.findById(req.params.id)
        .select("subscriptionId guestLimit guestList")
        .lean();
      const attachedSubscriptionId = event?.subscriptionId;
      if (attachedSubscriptionId) {
        capacitySub = await Subscription.findOne({
          _id: attachedSubscriptionId,
          userId,
          status: { $in: ["active", "trial"] },
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        }).populate("planId");

        // List cap: a guest is free to add — capacity is the subscription's
        // total invite pool (invitePool + compensation), independent of how
        // much has been sent/consumed (sending is gated separately at send
        // time). The service layer enforces this authoritatively; here we just
        // reject obviously-over-capacity requests early. Unlimited plans
        // (invitePool null) have no cap.
        if (
          capacitySub &&
          capacitySub.invitePool !== null &&
          capacitySub.invitePool !== undefined
        ) {
          const capacity =
            (capacitySub.invitePool || 0) + (capacitySub.compensationPool || 0);
          if (guestCount > capacity) {
            capacitySub = null;
          }
        }
      }
    }
    if (!capacitySub) {
      capacitySub = await Subscription.getCapacityForEvent(userId, guestCount);
    }
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

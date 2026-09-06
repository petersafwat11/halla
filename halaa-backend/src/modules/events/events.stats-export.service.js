/**
 * Events Service — Stats & Export sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.stats-export.service
 */

const { EVENT_STATUS } = require("../../shared/constants");
const { ROLES } = require("../../shared/constants/roles");
const {
  NotFoundError,
} = require("../../shared/errors");
// Every export/notification helper uses formatRiyadh so we don't
// re-render UTC server-locale dates as the previous local day.
const { formatRiyadh } = require("../../shared/utils/timezone");

// Import existing models during migration
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const { isPoolPlan, isPerEventPlan } = require('../../shared/constants/plans');
const { countsAgainstPlanStatusFilter } = require('../../shared/constants/events');
const { classifyRsvpBucket } = require('../../shared/constants/status');
const { isTrialFromPlan } = require('../../shared/utils/schedulingWindow');
const { getActiveEventGuestsFilter } = require('../../shared/utils/guestFilter');
const { calculateInvitationBalance } = require('../subscriptions/invitationBalance.presenter');

module.exports = {
  /**
   * Get aggregated event stats
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getEventStats(userId) {
    const [eventStats, guestStats] = await Promise.all([
      Event.aggregate([
        // Exclude soft-deleted events. Events are now soft-deleted (status
        // 'deleted') rather than hard-removed, so they must be filtered out
        // here or `totalEvents` would inflate with deleted events.
        { $match: { host: new (require('mongoose').Types.ObjectId)(userId), status: { $ne: EVENT_STATUS.DELETED } } },
        { $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          activeEvents: { $sum: { $cond: [{ $in: ['$status', [EVENT_STATUS.SCHEDULED, EVENT_STATUS.LIVE]] }, 1, 0] } },
          completedEvents: { $sum: { $cond: [{ $eq: ['$status', EVENT_STATUS.COMPLETED] }, 1, 0] } },
        }},
      ]),
      Guest.aggregate([
        { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'evt' } },
        { $unwind: '$evt' },
        // Same soft-delete exclusion: guests of deleted events are kept in the
        // collection but must not count toward host guest stats.
        { $match: { 'evt.host': new (require('mongoose').Types.ObjectId)(userId), 'evt.status': { $ne: EVENT_STATUS.DELETED } } },
        { $group: {
          _id: null,
          totalGuests: { $sum: 1 },
          confirmedGuests: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          checkedInGuests: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
        }},
      ]),
    ]);

    const es = eventStats[0] || { totalEvents: 0, activeEvents: 0, completedEvents: 0 };
    const gs = guestStats[0] || { totalGuests: 0, confirmedGuests: 0, checkedInGuests: 0 };

    return { ...es, ...gs, _id: undefined };
  },

  /**
   * Get subscription info for event creation
   * @param {string} userId
   * @param {Object} subscription
   * @returns {Promise<Object>}
   */
  async getSubscriptionInfo(userId, subscription) {
    if (!subscription) {
      return { hasSubscription: false, canCreateEvent: false };
    }

    const limits = subscription.limits;
    const planType = subscription.planId?.planType;
    const isPerEvent = planType ? isPerEventPlan(planType) : false;
    const isPool = planType ? isPoolPlan(planType) : false;

    // Plan schema field is `maxEvents`. Pool plans (basic_monthly, premium_monthly,
    // business_quarterly, business_annual, unlimited) have maxEvents=-1 (unlimited
    // events; the cap is invitePool). Per-event plans have maxEvents=1.
    const maxEvents = limits?.maxEvents ?? (isPerEvent ? 1 : -1);
    let eventsThisPeriod = subscription.usage?.eventsCreated || 0;
    if (!isPerEvent && maxEvents !== -1 && maxEvents > 0) {
      const billingStart = subscription.getBillingPeriodStart
        ? subscription.getBillingPeriodStart()
        : (subscription.startDate || subscription.createdAt);
      eventsThisPeriod = await Event.countDocuments({
        host: userId, createdAt: { $gte: billingStart }, ...countsAgainstPlanStatusFilter(),
      });
    }

    // canCreateEvent (capability hint for the FE — must match the real gate in
    // subscriptions.service.validateEventCreation). Per-event plans are "used
    // up" the moment sending starts: blocked once `firstSendAt` is set, even
    // after cancel/delete. (NOT invitesConsumed — a refund clawback bumps that
    // without a send and must not lock an unsent plan.) Pool plans (-1) unlimited.
    let canCreateEvent;
    if (isPerEvent) {
      canCreateEvent = !subscription.firstSendAt;
    } else {
      canCreateEvent = maxEvents === -1 ? true : eventsThisPeriod < maxEvents;
    }

    // Normalized guest limits — single source of truth for frontend
    const invitationBalance = calculateInvitationBalance(subscription, subscription.planId);
    let guestLimit, isGuestUnlimited, invitePool;
    if (isPerEvent) {
      invitePool = subscription.invitePool ?? null;
      if (invitePool !== null) {
        guestLimit = invitePool + (subscription.compensationPool || 0);
        isGuestUnlimited = false;
      } else {
        guestLimit = limits?.maxInvitesPerEvent ?? 50;
        isGuestUnlimited = guestLimit === -1;
      }
    } else if (isPool) {
      guestLimit = -1;
      isGuestUnlimited = true;
      invitePool = subscription.invitePool ?? null;
    } else {
      guestLimit = limits?.maxInvitesPerEvent ?? 50;
      isGuestUnlimited = guestLimit === -1;
      invitePool = subscription.invitePool ?? null;
    }

    const eventsRemaining = isPerEvent
      ? Math.max(0, 1 - (subscription.usage?.eventsCreated || 0))
      : maxEvents === -1
        ? -1
        : Math.max(0, maxEvents - eventsThisPeriod);

    return {
      hasSubscription: true,
      status: subscription.status,
      planType: subscription.planType,
      planCode: subscription.planCode,
      isSingleEvent: isPerEvent,
      isPoolPlan: isPool,
      canCreateEvent,
      guestLimit,
      isGuestUnlimited,
      invitePool,
      invitationBalance,
      eventsRemaining,
      eventsUsed: eventsThisPeriod,
    };
  },

  /**
   * Get single event stats.
   *
   * Scoped via `_buildScopedEventQuery` so admin/moderator/super_admin
   * can poll stats for any event, while hosts see only their own.
   *
   * @param {string} eventId
   * @param {Object} userContext - req.user
   * @returns {Promise<Object>}
   */
  async getSingleEventStats(eventId, userContext) {
    const query = this._buildScopedEventQuery(eventId, userContext);
    const event = await Event.findOne(query).populate("host", "email phoneNumber name");
    if (!event) throw new NotFoundError("Event");

    const guests = await Guest.find(getActiveEventGuestsFilter(eventId, event.guestList))
      .populate("addedBy", "name")
      .lean();

    const eventObj = event.toObject ? event.toObject() : event;
    const host = eventObj.host || null;
    const unansweredSentCount = guests.filter((g) => g.invitation?.sent === true && g.rsvp?.responded !== true).length;

    return {
      status: eventObj.status,
      event: {
        id: eventObj._id,
        capabilities: require("./eventActionCapabilities").eventActionCapabilities(eventObj),
        title: eventObj.eventDetails?.title || "",
        type: eventObj.eventDetails?.type || "",
        date: eventObj.eventDetails?.date,
        testMessageSent: eventObj.testMessageSent || false,
        whatsappTemplateStatus: eventObj.whatsappTemplateStatus || null,
        launchSettings: eventObj.launchSettings || null,
        status: eventObj.status,
        // Required by `useEventActionGate` so admin web + mobile resolve
        // the test/schedule/notify-staff visibility identically to the
        // host web page (which loads the full event via getEventById).
        taqnyatTemplate: eventObj.taqnyatTemplate || null,
        staffList: eventObj.staffList || [],
        messagingStatus: eventObj.messagingStatus || null,
        host: eventObj.host || null,
      },
      host: host
        ? {
            id: host._id,
            name: host.name || "",
            phoneNumber: host.phoneNumber || "",
          }
        : null,
      guests: guests.map((g) => {
        const guestObj = g;
        return {
          id: guestObj._id,
          name: guestObj.name || "",
          phone: guestObj.phone || "",
          status: guestObj.status || "invited",
          addedBy: guestObj.addedBy || "",
          responseTime: guestObj.rsvp?.respondedAt || null,
          invitation: guestObj.invitation || {},
        };
      }),
      staff: eventObj.staffList || [],
      subscription: eventObj.subscription || null,
      eventDetails: eventObj.eventDetails || null,
      eventId,
      totalGuests: guests.length,
      confirmed: guests.filter((g) => ['confirmed', 'checked_in'].includes(g.status)).length,
      declined: guests.filter((g) => g.status === "declined").length,
      pending: guests.filter((g) => classifyRsvpBucket(g.status) === "pending").length,
      checkedIn: guests.filter((g) => g.status === "checked_in").length,
      unansweredSentCount,
      hasUnansweredSentGuests: unansweredSentCount > 0,
    };
  },

  /**
   * Get event capabilities and entitlement based on event ownership and stamped subscription.
   * Resolves EVT-10 and unifies admin-on-behalf capability resolution.
   *
   * @param {string} eventId
   * @param {Object} userContext
   * @returns {Promise<Object>}
   */
  async getEventCapabilities(eventId, userContext) {
    const query = this._buildScopedEventQuery(eventId, userContext);
    const event = await Event.findOne(query).populate("host", "email phoneNumber name");
    if (!event) throw new NotFoundError("Event");

    let sub = null;
    if (event.subscriptionId) {
      sub = await Subscription.findById(event.subscriptionId)
        .populate("planId", "planType code limits name")
        .lean();
    }

    if (!sub && event.host) {
      const hostId = event.host._id || event.host;
      sub = await Subscription.findOne({
        userId: hostId,
        status: { $in: ["active", "trial"] },
      })
        .sort({ createdAt: -1 })
        .populate("planId", "planType code limits name")
        .lean();
    }

    const isPerEvent = sub ? isPerEventPlan(sub.planId?.planType || sub.planType) : false;
    const isPool = sub ? isPoolPlan(sub.planId?.planType || sub.planType) : false;
    const invitationBalance = calculateInvitationBalance(sub, sub?.planId);
    const invitePool = sub?.invitePool ?? null;
    const compensationPool = sub?.compensationPool || 0;

    const isGuestUnlimited = invitationBalance.unlimited;
    const guestLimit =
      invitePool !== null
        ? invitePool + compensationPool
        : (event.guestLimit || sub?.limits?.maxInvitesPerEvent || -1);

    const isTrial = isTrialFromPlan(sub?.planId);
    const isLive = event.status === EVENT_STATUS.LIVE;
    const isCompleted = event.status === EVENT_STATUS.COMPLETED;
    const isCancelled = event.status === EVENT_STATUS.CANCELLED;
    const isTerminal = [
      EVENT_STATUS.COMPLETED,
      EVENT_STATUS.CANCELLED,
      EVENT_STATUS.DELETED,
      EVENT_STATUS.FAILED,
      EVENT_STATUS.ARCHIVED,
    ].includes(event.status);

    return {
      ...require("./eventActionCapabilities").eventActionCapabilities(event),
      eventId: event._id,
      hostId: event.host?._id || event.host,
      subscriptionId: sub?._id || null,
      hasSubscription: !!sub,
      status: sub?.status || null,
      planType: sub?.planId?.planType || sub?.planType || null,
      planCode: sub?.planId?.code || sub?.planCode || null,
      isSingleEvent: isPerEvent,
      isPoolPlan: isPool,
      isTrial,
      invitePool,
      invitationBalance,
      isGuestUnlimited,
      guestLimit,
      eventStatus: event.status,
      isLive,
      isCompleted,
      isCancelled,
      isTerminal,
      canEditEvent: !isTerminal,
      allowAddOnly: isLive,
    };
  },

  /**
   * Export events as Excel
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportEventsAsExcel(user) {
    const { generateExcel, guardExportMaxRows } = require("../../shared/utils/excelExport");

    const userId = user._id || user;
    // admin / moderator / super_admin may export ANY event platform-wide;
    // hosts export only their own.
    const platformWide = [ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN];
    const query = platformWide.includes(user?.role) ? {} : { host: userId };

    const count = await Event.countDocuments(query);
    guardExportMaxRows(count, 'events');

    const events = await Event.find(query)
      .populate("guestList", "status")
      .lean();

    const data = events.map((e) => ({
      Title: e.eventDetails?.title || "",
      Type: e.eventDetails?.type || "",
      Date: e.eventDetails?.date
        ? formatRiyadh(e.eventDetails.date, { style: "date" })
        : "",
      Status: e.status,
      "Total Guests": e.guestList?.length || 0,
      Confirmed:
        e.guestList?.filter((g) => g.status === "confirmed").length || 0,
      Created: formatRiyadh(e.createdAt, { style: "date" }),
    }));

    return generateExcel(data, "events");
  },
};

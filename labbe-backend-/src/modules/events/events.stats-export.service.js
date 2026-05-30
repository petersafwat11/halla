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
const { isPoolPlan, isPerEventPlan } = require('../../shared/constants/plans');

module.exports = {
  /**
   * Get aggregated event stats
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getEventStats(userId) {
    const [eventStats, guestStats] = await Promise.all([
      Event.aggregate([
        { $match: { host: new (require('mongoose').Types.ObjectId)(userId) } },
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
        { $match: { 'evt.host': new (require('mongoose').Types.ObjectId)(userId) } },
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
        host: userId, createdAt: { $gte: billingStart }, status: { $ne: "deleted" },
      });
    }

    // canCreateEvent: per-event plans allow 1 event, pool plans (-1) unlimited
    let canCreateEvent;
    if (isPerEvent) {
      canCreateEvent = (subscription.usage?.eventsCreated || 0) < 1 && !subscription.eventId;
    } else {
      canCreateEvent = maxEvents === -1 ? true : eventsThisPeriod < maxEvents;
    }

    // Normalized guest limits — single source of truth for frontend
    let guestLimit, isGuestUnlimited, invitePool, invitesRemaining;
    if (isPerEvent) {
      guestLimit = limits?.maxInvitesPerEvent ?? 50;
      isGuestUnlimited = guestLimit === -1;
      invitePool = null;
      invitesRemaining = null;
    } else if (isPool) {
      guestLimit = -1;
      isGuestUnlimited = true;
      invitePool = subscription.invitePool ?? null;
      invitesRemaining = subscription.invitesRemaining ?? null;
    } else {
      guestLimit = limits?.maxInvitesPerEvent ?? 50;
      isGuestUnlimited = guestLimit === -1;
      invitePool = subscription.invitePool ?? null;
      invitesRemaining = subscription.invitesRemaining ?? null;
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
      invitesRemaining,
      eventsRemaining,
      eventsUsed: eventsThisPeriod,
    };
  },

  /**
   * Get single event stats.
   *
   * Tenant-scoped via `_buildScopedEventQuery` so
   * whitelabel-admin/moderator can poll stats for their own events.
   *
   * @param {string} eventId
   * @param {Object} userContext - req.user
   * @returns {Promise<Object>}
   */
  async getSingleEventStats(eventId, userContext) {
    const query = this._buildScopedEventQuery(eventId, userContext);
    const event = await Event.findOne(query).populate("host", "username email phoneNumber name");
    if (!event) throw new NotFoundError("Event");

    const guests = await Guest.find({ event: eventId })
      .populate("addedBy", "username name")
      .lean();

    const eventObj = event.toObject ? event.toObject() : event;
    const host = eventObj.host || null;

    return {
      event: {
        id: eventObj._id,
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
        whitelabelId: eventObj.whitelabelId || null,
      },
      host: host
        ? {
            id: host._id,
            username: host.username || "",
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
        };
      }),
      staff: eventObj.staffList || [],
      subscription: eventObj.subscription || null,
      eventDetails: eventObj.eventDetails || null,
      eventId,
      totalGuests: guests.length,
      confirmed: guests.filter((g) => g.status === "confirmed").length,
      declined: guests.filter((g) => g.status === "declined").length,
      maybe: guests.filter((g) => g.status === "maybe").length,
      pending: guests.filter((g) => g.status === "invited").length,
      checkedIn: guests.filter((g) => g.status === "checked_in").length,
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
    const query = { host: userId };
    // Whitelabel admins/moderators may only export rows inside their tenant.
    // Super-admin / platform contexts are unscoped.
    if (
      user?.role === ROLES.WHITELABEL_ADMIN ||
      user?.role === ROLES.WHITELABEL_MODERATOR ||
      user?.role === ROLES.ADMIN ||
      user?.role === ROLES.MODERATOR
    ) {
      if (user.whitelabelId) query.whitelabelId = user.whitelabelId;
    }

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

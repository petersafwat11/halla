/**
 * Dashboard Service
 * Business logic for admin dashboard statistics - NO HTTP concerns
 * @module modules/dashboard/dashboard.service
 */

const {
  ROLES,
  USER_STATUS,
  EVENT_STATUS,
  TICKET_STATUS,
  SUBSCRIPTION_STATUS,
  GUEST_STATUS,
} = require('../../shared/constants');

const User = require('../../../models/UserModel');
const Event = require('../../../models/EventModel');
const Subscription = require('../../../models/SubscriptionModel');
const Ticket = require('../../../models/TicketModel');
const Guest = require('../../../models/GuestModel');
const Service = require('../../../models/ServiceModel');
const { isPoolPlan, isPerEventPlan, COMPENSATION_PERCENTAGE } = require('../../shared/constants/plans');

class DashboardService {
  /**
   * Get date range for statistics
   * @param {string} period - 'today' | 'week' | 'month' | 'quarter' | 'year'
   * @returns {{startDate: Date, endDate: Date}}
   */
  getDateRange(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
    }

    return { startDate, endDate: new Date() };
  }

  /**
   * Calculate percentage change
   * @param {number} current
   * @param {number} previous
   * @returns {number}
   */
  calculateChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Get main dashboard statistics
   * @param {string} period
   * @param {Object|null} dateRange - Optional { from, to } to override period-based range
   * @returns {Promise<Object>}
   */
  async getDashboardStats(period = 'month', dateRange = null) {
    let startDate;
    let endDate;

    if (dateRange?.from || dateRange?.to) {
      startDate = dateRange.from ? new Date(dateRange.from) : new Date(0);
      endDate = dateRange.to ? new Date(dateRange.to) : new Date();
    } else {
      const range = this.getDateRange(period);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const previousStartDate = new Date(startDate);
    previousStartDate.setTime(previousStartDate.getTime() - (endDate - startDate));

    const [
      totalHosts,
      activeHosts,
      newHostsThisPeriod,
      newHostsPreviousPeriod,
      totalVendors,
      pendingVendors,
      newVendorsThisPeriod,
      totalEvents,
      activeEvents,
      newEventsThisPeriod,
      newEventsPreviousPeriod,
      activeSubscriptions,
      subscriptionsByPlan,
      openTickets,
      resolvedTicketsThisPeriod,
      recentHosts,
      recentEvents,
      topVendorsByViews,
      guestStatsAgg,
      totalTickets,
      resolvedTicketsTotal,
    ] = await Promise.all([
      User.countDocuments({ role: ROLES.HOST }),
      User.countDocuments({ role: ROLES.HOST, status: USER_STATUS.ACTIVE }),
      User.countDocuments({ role: ROLES.HOST, createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({ role: ROLES.HOST, createdAt: { $gte: previousStartDate, $lt: startDate } }),
      User.countDocuments({ role: ROLES.VENDOR }),
      User.countDocuments({ role: ROLES.VENDOR, status: USER_STATUS.PENDING }),
      User.countDocuments({ role: ROLES.VENDOR, createdAt: { $gte: startDate, $lte: endDate } }),
      Event.countDocuments({}),
      Event.countDocuments({ status: { $in: [EVENT_STATUS.SCHEDULED, EVENT_STATUS.LIVE] } }),
      Event.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Event.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
      Subscription.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE }),
      Subscription.aggregate([
        { $match: { status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] } } },
        { $lookup: { from: 'plans', localField: 'planId', foreignField: '_id', as: 'plan' } },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$plan.planType', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({ status: { $in: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] } }),
      Ticket.countDocuments({ status: TICKET_STATUS.RESOLVED, updatedAt: { $gte: startDate, $lte: endDate } }),
      User.find({ role: ROLES.HOST }).select('username name email createdAt status').sort({ createdAt: -1 }).limit(5).lean(),
      Event.find({}).select('eventDetails.title eventDetails.date status host').populate('host', 'username name').sort({ createdAt: -1 }).limit(5).lean(),
      Service.aggregate([
        { $group: { _id: '$vendor', totalViews: { $sum: { $ifNull: ['$views', 0] } } } },
        { $sort: { totalViews: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'vendorUser' } },
        { $unwind: { path: '$vendorUser', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: {
              $ifNull: [
                '$vendorUser.profile.vendorData.brandName',
                '$vendorUser.name',
              ],
            },
            numberOfClicks: '$totalViews',
          },
        },
      ]),
      Guest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({}),
      Ticket.countDocuments({ status: TICKET_STATUS.RESOLVED }),
    ]);

    const subscriptionsByPlanFormatted = {};
    subscriptionsByPlan.forEach((item) => {
      const key = item._id || 'other';
      subscriptionsByPlanFormatted[key] = (subscriptionsByPlanFormatted[key] || 0) + item.count;
    });

    const analytics = null;

    const totalSubscriptionsByPlan = Object.values(subscriptionsByPlanFormatted).reduce((a, b) => a + b, 0);

    const guestStatsMap = {};
    guestStatsAgg.forEach((item) => { guestStatsMap[item._id] = item.count; });

    const guestStats = {
      totalConfirmed: guestStatsMap[GUEST_STATUS.CONFIRMED] || 0,
      totalDeclined: guestStatsMap[GUEST_STATUS.DECLINED] || 0,
      totalPending: (guestStatsMap[GUEST_STATUS.INVITED] || 0) + (guestStatsMap[GUEST_STATUS.MAYBE] || 0),
    };

    const ticketsData = {
      resolved: resolvedTicketsTotal || 0,
      totalPending: openTickets || 0,
      allTickets: totalTickets || 0,
    };

    return {
      // statsCards items use translation keys; clients render via t(titleKey) and
      // t(subtitle.labelKey, { count: subtitle.count }). highlight is null when
      // there's nothing to show.
      statsCards: [
        {
          id: 'hosts',
          icon: 'users',
          titleKey: 'stats.hosts.title',
          value: totalHosts,
          subtitle: { count: activeHosts, labelKey: 'stats.hosts.subtitle' },
          highlight: newHostsThisPeriod > 0
            ? { count: newHostsThisPeriod, labelKey: 'stats.hosts.highlight' }
            : null,
        },
        {
          id: 'vendors',
          icon: 'store',
          titleKey: 'stats.vendors.title',
          value: totalVendors,
          subtitle: { count: pendingVendors, labelKey: 'stats.vendors.subtitle' },
          highlight: newVendorsThisPeriod > 0
            ? { count: newVendorsThisPeriod, labelKey: 'stats.vendors.highlight' }
            : null,
        },
        {
          id: 'events',
          icon: 'calendar',
          titleKey: 'stats.events.title',
          value: totalEvents,
          subtitle: { count: activeEvents, labelKey: 'stats.events.subtitle' },
          highlight: {
            count: this.calculateChange(newEventsThisPeriod, newEventsPreviousPeriod),
            labelKey: 'stats.events.highlight',
          },
        },
        {
          id: 'subscriptions',
          icon: 'credit-card',
          titleKey: 'stats.subscriptions.title',
          value: activeSubscriptions,
          subtitle: { count: totalSubscriptionsByPlan, labelKey: 'stats.subscriptions.subtitle' },
          highlight: null,
        },
        {
          id: 'tickets',
          icon: 'ticket',
          titleKey: 'stats.tickets.title',
          value: openTickets,
          subtitle: { count: resolvedTicketsThisPeriod, labelKey: 'stats.tickets.subtitle' },
          highlight: null,
        },
      ],
      charts: {
        subscriptionsByPlan: subscriptionsByPlanFormatted,
        guestStats,
        tickets: ticketsData,
        period,
      },
      recentActivity: {
        hosts: recentHosts.map((h) => ({
          id: h._id,
          name: h.name || h.username,
          email: h.email,
          status: h.status,
          createdAt: h.createdAt,
        })),
        events: recentEvents.map((e) => ({
          id: e._id,
          title: e.eventDetails?.title,
          date: e.eventDetails?.date,
          status: e.status,
          host: e.host?.name || e.host?.username,
        })),
      },
      bestVendors: topVendorsByViews.map((v) => ({
        name: v.name || 'Unknown',
        numberOfClicks: v.numberOfClicks || 0,
      })),
      analytics,
      period,
    };
  }

  /**
   * Get host dashboard stats
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getHostDashboardStats(userId) {
    const [
      totalEvents,
      activeEvents,
      completedEvents,
      pendingSchedulingEvents,
      subscription,
      lastEvent,
    ] = await Promise.all([
      Event.countDocuments({ host: userId }),
      Event.countDocuments({ host: userId, status: { $in: [EVENT_STATUS.SCHEDULED, EVENT_STATUS.LIVE] } }),
      Event.countDocuments({ host: userId, status: EVENT_STATUS.COMPLETED }),
      Event.countDocuments({ host: userId, status: EVENT_STATUS.PENDING_SCHEDULING }),
      Subscription.findOne({ userId, status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] } }).populate('planId').lean(),
      Event.findOne({ host: userId })
        .select('eventDetails.title eventDetails.date eventDetails.time eventDetails.location eventDetails.locationName status guestList createdAt launchSettings testMessageSent templateImage visualTemplate taqnyatTemplate guestReplies')
        .sort({ createdAt: -1 })
        .populate('guestList')
        .populate({ path: 'taqnyatTemplate.templateRef' })
        .lean(),
    ]);

    let lastEventData = null;
    if (lastEvent) {
      const guests = await Guest.find({ event: lastEvent._id }).lean();

      const guestStats = {
        total: guests.length,
        confirmed: guests.filter(g => g.status === 'confirmed').length,
        declined: guests.filter(g => g.status === 'declined').length,
        invited: guests.filter(g => g.status === 'invited').length,
        checkedIn: guests.filter(g => g.status === 'checked_in').length,
      };

      const responseRate = guestStats.total > 0
        ? Math.round(((guestStats.confirmed + guestStats.declined) / guestStats.total) * 100)
        : 0;

      // Quota mirrors the create-event surface (events.stats-export.service.js):
      // pool plans → use the shared pool counters; per-event plans → use the
      // per-event cap minus already-added guests. `null` remainingGuests means
      // unlimited (admin/super-admin plans where invitePool is null).
      const planType = subscription?.planId?.planType;
      const planLimits = subscription?.planId?.limits || {};

      let remainingGuests;
      let compensationMessages;
      if (subscription && isPoolPlan(planType)) {
        // Pool plans: invitesRemaining = invitePool + compensationPool - invitesConsumed.
        // compensationMessages surfaces the compensation slice of that pool.
        remainingGuests =
          subscription.invitePool == null
            ? null
            : Math.max(
                0,
                (subscription.invitePool || 0) +
                  (subscription.compensationPool || 0) -
                  (subscription.invitesConsumed || 0)
              );
        compensationMessages = subscription.compensationPool ?? 0;
      } else {
        const maxInvitesPerEvent = planLimits.maxInvitesPerEvent ?? null;
        remainingGuests =
          maxInvitesPerEvent == null || maxInvitesPerEvent === -1
            ? null
            : Math.max(0, maxInvitesPerEvent - guests.length);
        compensationMessages =
          maxInvitesPerEvent != null && maxInvitesPerEvent !== -1
            ? Math.floor((COMPENSATION_PERCENTAGE / 100) * maxInvitesPerEvent)
            : 0;
      }

      lastEventData = {
        id: lastEvent._id,
        title: lastEvent.eventDetails?.title || '',
        date: lastEvent.eventDetails?.date,
        time: lastEvent.eventDetails?.time,
        location: lastEvent.eventDetails?.location,
        locationName: lastEvent.eventDetails?.location?.address || '',
        status: lastEvent.status,
        createdAt: lastEvent.createdAt,
        guestCount: guests.length,
        responseRate: `${responseRate}%`,
        stats: guestStats,
        quota: {
          remainingGuests,
          compensationMessages,
        },
        testMessageSent: lastEvent.testMessageSent || false,
        launchSettings: lastEvent.launchSettings || null,
        templateImage:
          lastEvent.visualTemplate?.bakedImagePath ||
          lastEvent.templateImage ||
          null,
        visualTemplate: lastEvent.visualTemplate || null,
        taqnyatTemplate: lastEvent.taqnyatTemplate || null,
      };
    }

    return {
      stats: {
        totalEvents,
        activeEvents,
        pendingSchedulingEvents,
        endedEvents: completedEvents,
      },
      lastEvent: lastEventData,
      // `guestsLimit: null` means unlimited.
      subscription: subscription
        ? {
          planName: subscription.planId?.name || 'Unknown',
          status: subscription.status,
          expiresAt: subscription.endDate,
          eventsUsed: subscription.usage?.eventsCreated ?? 0,
          eventsLimit: subscription.planId?.limits?.maxEvents ?? 1,
          guestsUsed: subscription.usage?.guestsUsed ?? 0,
          guestsLimit: subscription.planId?.limits?.maxInvitesPerEvent ?? null,
        }
        : null,
      hasEvents: totalEvents > 0,
    };
  }

}

module.exports = new DashboardService();

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
  SERVICE_STATUS,
} = require('../../shared/constants');

// Import existing models during migration
const User = require('../../../models/UserModel');
const Event = require('../../../models/EventModel');
const Subscription = require('../../../models/SubscriptionModel');
const Ticket = require('../../../models/TicketModel');
const Guest = require('../../../models/GuestModel');
const Service = require('../../../models/ServiceModel');

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
   * @param {Object} whitelabelFilter
   * @param {Object|null} dateRange - Optional { from, to } to override period-based range
   * @returns {Promise<Object>}
   */
  async getDashboardStats(period = 'month', whitelabelFilter = {}, dateRange = null) {
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
    ] = await Promise.all([
      User.countDocuments({ role: ROLES.HOST, ...whitelabelFilter }),
      User.countDocuments({ role: ROLES.HOST, status: USER_STATUS.ACTIVE, ...whitelabelFilter }),
      User.countDocuments({ role: ROLES.HOST, createdAt: { $gte: startDate, $lte: endDate }, ...whitelabelFilter }),
      User.countDocuments({ role: ROLES.HOST, createdAt: { $gte: previousStartDate, $lt: startDate }, ...whitelabelFilter }),
      User.countDocuments({ role: ROLES.VENDOR, ...whitelabelFilter }),
      User.countDocuments({ role: ROLES.VENDOR, status: USER_STATUS.PENDING, ...whitelabelFilter }),
      User.countDocuments({ role: ROLES.VENDOR, createdAt: { $gte: startDate, $lte: endDate }, ...whitelabelFilter }),
      Event.countDocuments({ ...whitelabelFilter }),
      Event.countDocuments({ status: { $in: [EVENT_STATUS.SCHEDULED, EVENT_STATUS.LIVE] }, ...whitelabelFilter }),
      Event.countDocuments({ createdAt: { $gte: startDate, $lte: endDate }, ...whitelabelFilter }),
      Event.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate }, ...whitelabelFilter }),
      Subscription.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE, ...whitelabelFilter }),
      Subscription.aggregate([
        { $match: { status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] }, ...whitelabelFilter } },
        { $group: { _id: '$planType', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({ status: { $in: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] }, ...whitelabelFilter }),
      Ticket.countDocuments({ status: TICKET_STATUS.RESOLVED, updatedAt: { $gte: startDate, $lte: endDate }, ...whitelabelFilter }),
      User.find({ role: ROLES.HOST, ...whitelabelFilter }).select('username name email createdAt status').sort({ createdAt: -1 }).limit(5),
      Event.find({ ...whitelabelFilter }).select('eventDetails.title eventDetails.date status host').populate('host', 'username name').sort({ createdAt: -1 }).limit(5),
      // Top 5 vendors by total service views
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
    ]);

    const subscriptionsByPlanFormatted = {};
    subscriptionsByPlan.forEach((item) => {
      subscriptionsByPlanFormatted[item._id || 'unknown'] = item.count;
    });

    // --- Whitelabel-specific analytics ---
    // Only runs for whitelabel tenants (whitelabelId is a real ObjectId, not null)
    let analytics = null;
    const isWhitelabelTenant = whitelabelFilter?.whitelabelId != null;

    if (isWhitelabelTenant) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [monthlyEventsAgg, eventsByStatusAgg, allEventIds] = await Promise.all([
        Event.aggregate([
          { $match: { ...whitelabelFilter, createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Event.aggregate([
          { $match: whitelabelFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Event.find(whitelabelFilter).distinct('_id'),
      ]);

      const totalGuests = await Guest.countDocuments({ event: { $in: allEventIds } });

      const arabicMonths = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
      ];

      const statusMap = {};
      eventsByStatusAgg.forEach((item) => { statusMap[item._id] = item.count; });

      analytics = {
        monthlyEvents: monthlyEventsAgg.map((item) => ({
          month: arabicMonths[item._id.month - 1],
          year: item._id.year,
          count: item.count,
        })),
        eventsByStatus: {
          draft: statusMap.draft || 0,
          scheduled: statusMap.scheduled || 0,
          live: statusMap.live || 0,
          completed: statusMap.completed || 0,
        },
        totalGuests,
        activeEvents: (statusMap.scheduled || 0) + (statusMap.live || 0),
      };
    }

    return {
      // For StatsCards component - pre-mapped array ready for rendering
      statsCards: [
        {
          id: 'hosts',
          icon: 'users',
          title: 'Total Hosts',
          value: totalHosts,
          subtitle: `${activeHosts} active`,
          highlight: newHostsThisPeriod > 0 ? `+${newHostsThisPeriod} new` : null,
        },
        {
          id: 'vendors',
          icon: 'store',
          title: 'Total Vendors',
          value: totalVendors,
          subtitle: `${pendingVendors} pending approval`,
          highlight: newVendorsThisPeriod > 0 ? `+${newVendorsThisPeriod} new` : null,
        },
        {
          id: 'events',
          icon: 'calendar',
          title: 'Total Events',
          value: totalEvents,
          subtitle: `${activeEvents} active`,
          highlight: this.calculateChange(newEventsThisPeriod, newEventsPreviousPeriod),
        },
        {
          id: 'subscriptions',
          icon: 'credit-card',
          title: 'Active Subscriptions',
          value: activeSubscriptions,
          subtitle: `${Object.values(subscriptionsByPlanFormatted).reduce((a, b) => a + b, 0)} by plan`,
          highlight: null,
        },
        {
          id: 'tickets',
          icon: 'ticket',
          title: 'Open Tickets',
          value: openTickets,
          subtitle: `${resolvedTicketsThisPeriod} resolved this period`,
          highlight: null,
        },
      ],
      // Charts data
      charts: {
        subscriptionsByPlan: subscriptionsByPlanFormatted,
        period,
      },
      // Tables data
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
      // Top vendors by service views — used by both web Bottom component and mobile AdminDashboardScreen
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
      draftEvents,
      subscription,
      lastEvent,
    ] = await Promise.all([
      Event.countDocuments({ host: userId }),
      Event.countDocuments({ host: userId, status: { $in: [EVENT_STATUS.SCHEDULED, EVENT_STATUS.LIVE] } }),
      Event.countDocuments({ host: userId, status: EVENT_STATUS.COMPLETED }),
      Event.countDocuments({ host: userId, status: EVENT_STATUS.DRAFT }),
      Subscription.findOne({ userId, status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] } }).populate('planId'),
      // Get the last created event with full details
      Event.findOne({ host: userId })
        .select('eventDetails.title eventDetails.date eventDetails.time eventDetails.location eventDetails.locationName status guestList createdAt launchSettings invitationSettings testMessageSent visualTemplate taqnyatTemplate guestReplies')
        .sort({ createdAt: -1 })
        .populate('guestList'),
    ]);

    // Get guest stats for the last event if it exists
    let lastEventData = null;
    if (lastEvent) {
      const guests = await Guest.find({ event: lastEvent._id });

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

      // Calculate remaining guests quota from actual guests in event
      const planLimits = subscription?.planId?.limits || {};
      const planFeatures = subscription?.planId?.features || {};
      const maxGuestsPerEvent = planLimits.maxGuestsPerEvent || 100;
      const remainingGuests = Math.max(0, maxGuestsPerEvent - guests.length);
      const compensationMessages = planFeatures.hasCompensationInvites
        ? Math.floor((planFeatures.compensationPercentage || 10) / 100 * maxGuestsPerEvent)
        : 0;

      lastEventData = {
        id: lastEvent._id,
        title: lastEvent.eventDetails?.title || '',
        date: lastEvent.eventDetails?.date,
        time: lastEvent.eventDetails?.time,
        location: lastEvent.eventDetails?.location,
        locationName: lastEvent.eventDetails?.locationName || '',
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
        // Phase 4c W0-RENAME — emit BOTH legacy `invitationSettings`
        // shape (for older clients) AND the canonical top-level keys
        // (for new readers). Resolves templateImage from the canonical
        // `visualTemplate.bakedImagePath` first, falls back to legacy.
        invitationSettings: {
          selectedTemplate: lastEvent.invitationSettings?.selectedTemplate || null,
          templateImage:
            lastEvent.visualTemplate?.bakedImagePath ||
            lastEvent.invitationSettings?.templateImage ||
            null,
        },
        visualTemplate: lastEvent.visualTemplate || null,
        taqnyatTemplate: lastEvent.taqnyatTemplate || null,
      };
    }

    return {
      // For StatsCards component - direct use
      stats: {
        totalEvents,
        activeEvents,
        draftEvents,
        endedEvents: completedEvents,
      },
      // For LastEventStats component - pre-mapped, no calculations needed
      lastEvent: lastEventData,
      // For HeroSection component
      subscription: subscription
        ? {
          planName: subscription.planId?.name || 'Unknown',
          status: subscription.status,
          expiresAt: subscription.endDate,
          eventsUsed: subscription.usage?.eventsCreated || 0,
          eventsLimit: subscription.planId?.limits?.maxEvents || subscription.planId?.limits?.events || 1,
          guestsUsed: subscription.usage?.guestsUsed || 0,
          guestsLimit: subscription.planId?.limits?.maxGuestsPerEvent || subscription.planId?.limits?.guests || 100,
        }
        : null,
      // Templates data (if needed)
      hasEvents: totalEvents > 0,
    };
  }

  /**
   * Get vendor dashboard stats
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getVendorDashboardStats(userId) {
    const user = await User.findById(userId).select('profile.vendorData services');

    // Get vendor services statistics
    const services = await Service.find({ vendor: userId });

    const totalServices = services.length;
    const activeServices = services.filter(s => s.status === SERVICE_STATUS.ACTIVE).length;
    const inactiveServices = services.filter(s => s.status === SERVICE_STATUS.INACTIVE || s.status === SERVICE_STATUS.DISABLED).length;

    // Calculate rating from services
    const totalRating = services.reduce((sum, s) => sum + (s.rating || 0), 0);
    const averageRating = totalServices > 0 ? (totalRating / totalServices).toFixed(1) : '0.0';

    return {
      // For VendorStatsCards component - direct use
      stats: {
        totalServices,
        activeServices,
        inactiveServices,
        rating: averageRating,
      },
      // For profile display
      profile: {
        brandName: user?.profile?.vendorData?.brandName,
        status: user?.profile?.vendorData?.vendorStatus,
        rating: averageRating,
        reviewCount: user?.profile?.vendorData?.reviewCount || 0,
      },
      // Services list for the page
      services: services.map(s => ({
        id: s._id,
        name: s.name,
        status: s.status,
        rating: s.rating || 0,
        views: s.views || 0,
        inquiries: s.inquiries || 0,
      })),
    };
  }
}

module.exports = new DashboardService();

/**
 * Events Service
 * Business logic for event management - NO HTTP concerns
 * @module modules/events/events.service
 */

const config = require("../../config");
const { EVENT_STATUS, SUPERVISOR_STATUS } = require("../../shared/constants");
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  PackageLimitError,
} = require("../../shared/errors");

// Import existing models during migration
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const { isPoolPlan, isPerEventPlan } = require('../../shared/constants/plans');

// File upload helper
const { getFileUrl } = require('../../shared/utils/fileUpload');
const { normalizePhoneNumber } = require('../../shared/utils/phone');

// Import existing services
const notificationService = require('../notifications/notifications.service');
const SubscriptionsService = require('../subscriptions/subscriptions.service');
const StaffAccessToken = require('../../../models/StaffAccessTokenModel');
const taqnyat = require('../../infrastructure/taqnyat');

class EventsService {
  // ============================================
  // COMMON HELPERS
  // ============================================

  /**
   * Build search query
   * @param {string} searchValue
   * @param {string[]} fields
   * @returns {Object}
   */
  buildSearchQuery(searchValue, fields) {
    if (!searchValue) return {};
    const escaped = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = { $regex: escaped, $options: "i" };
    return {
      $or: fields.map((field) => ({ [field]: searchRegex })),
    };
  }

  /**
   * Create guests from list
   * @param {Array} guestData
   * @param {string} eventId
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async createGuestsFromList(guestData, eventId, userId) {
    if (!guestData.length) return [];

    const docs = guestData.map(guest => ({
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      event: eventId,
      status: "invited",
      invitedBy: guest.invitedBy || null,
      addedBy: userId,
    }));

    // Use Guest.create() instead of insertMany to trigger pre-save hooks (QR code generation)
    const savedGuests = await Guest.create(docs);
    return savedGuests.map(g => g._id);
  }

  // ============================================
  // EVENT QUERIES
  // ============================================

  /**
   * Get events for host
   * @param {string} userId
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getMyEvents(userId, filters = {}, options = {}) {
    const { search, status, from, to } = filters;
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    let query = { host: userId };

    if (search) {
      const searchQuery = this.buildSearchQuery(search, [
        "eventDetails.title",
        "eventDetails.type",
      ]);
      query = { ...query, ...searchQuery };
    }

    if (status) query.status = status;
    if (from || to) {
      query["eventDetails.date"] = {};
      if (from) query["eventDetails.date"].$gte = new Date(from);
      if (to) query["eventDetails.date"].$lte = new Date(to);
    }

    const [events, total] = await Promise.all([
      Event.find(query)
        .select('-guestList')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    // Get guest counts via aggregation (total + confirmed + declined)
    const eventIds = events.map(e => e._id);
    const [guestCounts, confirmedCounts, declinedCounts] = await Promise.all([
      Guest.aggregate([
        { $match: { event: { $in: eventIds } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
      Guest.aggregate([
        { $match: { event: { $in: eventIds }, status: { $in: ['confirmed', 'checked_in'] } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
      Guest.aggregate([
        { $match: { event: { $in: eventIds }, status: 'declined' } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
    ]);
    const countMap = {};
    guestCounts.forEach(g => { countMap[g._id.toString()] = g.count; });
    const confirmedMap = {};
    confirmedCounts.forEach(g => { confirmedMap[g._id.toString()] = g.count; });
    const declinedMap = {};
    declinedCounts.forEach(g => { declinedMap[g._id.toString()] = g.count; });

    return {
      data: events.map((e) => ({
        ...this._formatEvent(e),
        guestCount: countMap[e._id.toString()] || 0,
        confirmedCount: confirmedMap[e._id.toString()] || 0,
        declinedCount: declinedMap[e._id.toString()] || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get event by ID
   * @param {string} eventId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getEventById(eventId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId })
      .populate("guestList", "name email phone status")
      .populate("host", "username email phoneNumber");

    if (!event) {
      throw new NotFoundError("Event");
    }

    return { event };
  }

  /**
   * Get all events (admin)
   * @param {Object} filters
   * @param {Object} options
   * @param {Object} [whitelabelFilter]
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getAllEvents(filters = {}, options = {}, whitelabelFilter = null) {
    const { search, status, hostId, from, to } = filters;
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    let query = { status: { $ne: 'deleted' } };

    if (whitelabelFilter) {
      // Will need to join with host's whitelabelId
      query["host"] = {
        $in: await this._getWhitelabelHostIds(whitelabelFilter),
      };
    }

    if (search) {
      const searchQuery = this.buildSearchQuery(search, [
        "eventDetails.title",
        "eventDetails.type",
      ]);
      query = { ...query, ...searchQuery };
    }

    if (status) {
      if (status === 'deleted') {
        // Don't allow querying deleted events through normal filters
        query.status = { $ne: 'deleted' };
      } else {
        query.status = status;
      }
    }
    if (hostId) {
      // If whitelabel filter is active, ensure hostId is within the whitelabel scope
      if (query.host && query.host.$in) {
        const hostIdStr = hostId.toString();
        if (!query.host.$in.some(id => id.toString() === hostIdStr)) {
          // hostId not in whitelabel scope, keep the whitelabel restriction
        } else {
          query.host = hostId;
        }
      } else {
        query.host = hostId;
      }
    }
    if (from || to) {
      query["eventDetails.date"] = {};
      if (from) query["eventDetails.date"].$gte = new Date(from);
      if (to) query["eventDetails.date"].$lte = new Date(to);
    }

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("host", "username email phoneNumber name")
        .select('-guestList')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    // Get guest counts via aggregation (total + confirmed)
    const eventIds = events.map(e => e._id);
    const [guestCounts, confirmedCounts] = await Promise.all([
      Guest.aggregate([
        { $match: { event: { $in: eventIds } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
      Guest.aggregate([
        { $match: { event: { $in: eventIds }, status: { $in: ['confirmed', 'checked_in'] } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
    ]);
    const countMap = {};
    guestCounts.forEach(g => { countMap[g._id.toString()] = g.count; });
    const confirmedMap = {};
    confirmedCounts.forEach(g => { confirmedMap[g._id.toString()] = g.count; });

    return {
      data: events.map((e) => ({
        ...this._formatEventAdmin(e),
        guestCount: countMap[e._id.toString()] || 0,
        confirmedCount: confirmedMap[e._id.toString()] || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // EVENT CREATION
  // ============================================

  /**
   * Create event
   * @param {Object} eventData
   * @param {Array} guestList
   * @param {Object} context - { userId, userRole, subscription, file }
   * @returns {Promise<Object>}
   */
  async createEvent(eventData, guestList, context) {
    const { userId, userRole, subscription, file } = context;

    // Validate event data
    if (!eventData.eventDetails) {
      throw new ValidationError("Event details are required");
    }

    if (!guestList || guestList.length === 0) {
      throw new ValidationError("At least one guest is required");
    }

    // Validate subscription limits (async — dynamic event counting)
    if (subscription) {
      const validation = await SubscriptionsService.validateEventCreation(
        subscription,
        guestList.length,
        userId
      );
      if (!validation.allowed) {
        throw new PackageLimitError(
          "events",
          validation.limits?.maxEventsPerMonth || 0
        );
      }
    }

    // Capacity check: handle pool vs per-event plans
    const guestCount = guestList.length;
    const capacitySub = subscription
      ? await Subscription.findById(subscription._id).populate('planId')
      : await Subscription.getCapacityForEvent(userId, guestCount);

    if (!capacitySub) throw new Error('No active subscription with sufficient capacity');

    if (isPoolPlan(capacitySub.planId?.planType)) {
      await Subscription.consumeInvites(capacitySub._id, guestCount);
    } else if (isPerEventPlan(capacitySub.planId?.planType)) {
      const maxInvites = capacitySub.planId?.limits?.maxInvitesPerEvent;
      if (maxInvites !== null && maxInvites !== undefined && guestCount > maxInvites) {
        throw new Error(`Guest count exceeds plan limit of ${maxInvites}`);
      }
    }

    if (!subscription) {
      // Attach capacity subscription to eventData for tracking
      if (!eventData.subscriptionId) eventData.subscriptionId = capacitySub._id;
    }

    // Handle file upload — resolves correctly for both S3 (file.location) and local (file.path/filename)
    if (file) {
      const templateImagePath = getFileUrl(file);
      if (templateImagePath) {
        if (eventData.invitationSettings) {
          eventData.invitationSettings.templateImage = templateImagePath;
        } else {
          eventData.invitationSettings = { templateImage: templateImagePath };
        }
      }
    }

    // Set host and tracking info
    eventData.host = userId;
    eventData.createdBy = {
      user: userId,
      role: userRole || "host",
      onBehalfOf: false,
      createdAt: new Date(),
    };
    eventData.createdFor = {
      user: userId,
      role: userRole || "host",
      isSelf: true,
    };

    // Set subscription reference and freeze guest limit (Bugs 4, 7)
    if (subscription) {
      eventData.subscriptionId = subscription._id;
      eventData.planId = subscription.planId?._id || subscription.planId;
      // Freeze guest limit from current subscription for this event
      const plan = subscription.planId;
      if (isPoolPlan(plan?.planType)) {
        // Pool plans: unlimited per event; pool tracks capacity via invitesConsumed
        eventData.guestLimit = -1;
      } else {
        // Per-event plans: use the plan's maxInvitesPerEvent directly (no addon or compensation added here)
        eventData.guestLimit = plan?.limits?.maxInvitesPerEvent ?? null;
      }
    }

    // Create event
    const event = await Event.create(eventData);

    // Create guests
    const guestIds = await this.createGuestsFromList(
      guestList,
      event._id,
      userId
    );
    event.guestList = guestIds;
    await event.save();

    // Increment subscription usage
    if (subscription) {
      await Subscription.findByIdAndUpdate(subscription._id, {
        $inc: { "usage.eventsCreated": 1 },
      });
    }

    // Populate and return
    const populatedEvent = await Event.findById(event._id)
      .populate("host", "username email phoneNumber")
      .populate("guestList", "name email phone status");

    // Send notifications (non-blocking)
    this._notifyEventCreated(populatedEvent, userId, guestIds.length).catch(
      console.error
    );

    return { event: populatedEvent };
  }

  // ============================================
  // EVENT UPDATES
  // ============================================

  /**
   * Update event
   * @param {string} eventId
   * @param {Object} updateData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateEvent(eventId, updateData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });

    if (!event) {
      throw new NotFoundError("Event");
    }

    // Don't allow updates to completed/cancelled events
    if (
      [EVENT_STATUS.COMPLETED, EVENT_STATUS.CANCELLED].includes(event.status)
    ) {
      throw new ValidationError("Cannot update completed or cancelled events");
    }

    // Update allowed fields
    const allowedFields = [
      "eventDetails",
      "invitationSettings",
      "launchSettings",
      "staffList",
    ];
    allowedFields.forEach((field) => {
      if (updateData[field]) {
        event[field] = { ...event[field], ...updateData[field] };
      }
    });

    await event.save();

    return { event };
  }

  /**
   * Update event status
   * @param {string} eventId
   * @param {string} status
   * @param {string} userId
   * @param {boolean} [isAdmin=false]
   * @returns {Promise<Object>}
   */
  async updateEventStatus(eventId, status, userId, isAdmin = false) {
    const query = isAdmin ? { _id: eventId } : { _id: eventId, host: userId };

    const event = await Event.findOne(query);

    if (!event) {
      throw new NotFoundError("Event");
    }

    if (!Object.values(EVENT_STATUS).includes(status)) {
      throw new ValidationError("Invalid status value");
    }

    event.status = status;
    if (status === EVENT_STATUS.CANCELLED) {
      event.cancelledAt = new Date();
    }
    await event.save();

    // Release pool invites if event is cancelled and subscription is a pool plan
    if (status === EVENT_STATUS.CANCELLED && event.subscriptionId) {
      try {
        const sub = await Subscription.findById(event.subscriptionId).populate('planId');
        if (sub && isPoolPlan(sub.planId?.planType)) {
          const guestCount = event.guestList?.length || 0;
          if (guestCount > 0) await Subscription.releaseInvites(event.subscriptionId, guestCount);
        }
      } catch (e) {
        console.error('Failed to release pool invites on cancellation:', e.message);
      }
    }

    // Notify about status change (non-blocking)
    this._notifyEventStatusChange(event, status, userId, isAdmin).catch(console.error);

    return { event };
  }

  /**
   * Delete event
   * @param {string} eventId
   * @param {string} userId
   * @param {boolean} [isAdmin=false]
   * @returns {Promise<void>}
   */
  async deleteEvent(eventId, userId, isAdmin = false) {
    const query = isAdmin ? { _id: eventId } : { _id: eventId, host: userId };

    const event = await Event.findOne(query);

    if (!event) {
      throw new NotFoundError("Event");
    }

    const eventTitle = event.eventDetails?.title || 'Untitled';
    const hostId = event.host;

    // Notify admins of event deletion (non-blocking)
    notificationService.sendToAdmins({
      type: 'event_deleted',
      title: 'Event Deleted',
      titleAr: 'تم حذف المناسبة',
      message: `Event "${eventTitle}" has been deleted.`,
      messageAr: `تم حذف مناسبة "${eventTitle}".`,
      data: { entityType: 'event', entityId: eventId },
    }).catch(console.error);

    // If admin is deleting, also notify the host
    if (isAdmin && hostId && hostId.toString() !== userId.toString()) {
      notificationService.sendToUser(hostId, {
        type: 'event_deleted',
        title: 'Event Deleted',
        titleAr: 'تم حذف المناسبة',
        message: `Your event "${eventTitle}" has been deleted by an admin.`,
        messageAr: `تم حذف مناسبتك "${eventTitle}" من قبل المسؤول.`,
        data: { entityType: 'event', entityId: eventId },
        priority: 'high',
      }).catch(console.error);
    }

    // Use transaction for atomic deletion
    const session = await require('mongoose').startSession();
    try {
      await session.withTransaction(async () => {
        await Guest.deleteMany({ event: eventId }, { session });
        await Event.findByIdAndDelete(eventId, { session });
      });
    } finally {
      await session.endSession();
    }
  }

  // ============================================
  // GUEST MANAGEMENT
  // ============================================

  /**
   * Add guests to event
   * @param {string} eventId
   * @param {Array} guests
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async addGuests(eventId, guests, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });

    if (!event) {
      throw new NotFoundError("Event");
    }

    if (['cancelled', 'completed'].includes(event.status)) {
      throw new ValidationError("Cannot add guests to a " + event.status + " event");
    }

    const newGuestCount = guests.length;

    // Capacity check: handle pool vs per-event plans
    const capacitySub = event.subscriptionId
      ? await Subscription.findById(event.subscriptionId).populate('planId')
      : await Subscription.getCapacityForEvent(userId, newGuestCount);

    if (!capacitySub) throw new Error('No active subscription with sufficient capacity');

    if (isPoolPlan(capacitySub.planId?.planType)) {
      await Subscription.consumeInvites(capacitySub._id, newGuestCount);
    } else if (isPerEventPlan(capacitySub.planId?.planType)) {
      const maxInvites = capacitySub.planId?.limits?.maxInvitesPerEvent;
      if (maxInvites !== null && maxInvites !== undefined && newGuestCount > maxInvites) {
        throw new Error(`Guest count exceeds plan limit of ${maxInvites}`);
      }
    }

    if (!event.subscriptionId) {
      event.subscriptionId = capacitySub._id;
    }

    const guestIds = await this.createGuestsFromList(guests, eventId, userId);
    event.guestList.push(...guestIds);
    await event.save();

    const updatedEvent = await Event.findById(eventId).populate(
      "guestList",
      "name email phone status"
    );

    return { event: updatedEvent, addedCount: guestIds.length };
  }

  /**
   * Update guest status
   * @param {string} eventId
   * @param {string} guestId
   * @param {string} status
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateGuestStatus(eventId, guestId, status, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });

    if (!event) {
      throw new NotFoundError("Event");
    }

    const guest = await Guest.findOneAndUpdate(
      { _id: guestId, event: eventId },
      { status },
      { new: true }
    );

    if (!guest) {
      throw new NotFoundError("Guest");
    }

    return { guest };
  }

  // ============================================
  // STATS & INFO
  // ============================================

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
  }

  /**
   * Get subscription info for event creation
   * @param {string} userId
   * @param {Object} subscription
   * @returns {Promise<Object>}
   */
  async getSubscriptionInfo(userId, subscription) {
    if (!subscription) {
      return { hasSubscription: false, limits: null, usage: null, canCreateEvent: false };
    }

    // Dynamic event count (Bugs 1, 2, 8)
    let eventsThisPeriod = subscription.usage?.eventsCreated || 0;
    const maxEPM = subscription.limits?.maxEventsPerMonth || 0;
    if (maxEPM > 0) {
      const billingStart = subscription.getBillingPeriodStart
        ? subscription.getBillingPeriodStart()
        : (subscription.startDate || subscription.createdAt);
      eventsThisPeriod = await Event.countDocuments({
        host: userId, createdAt: { $gte: billingStart }, status: { $ne: 'deleted' },
      });
    }
    const canCreateEvent = maxEPM === -1 ? true : eventsThisPeriod < maxEPM;

    return {
      hasSubscription: true,
      status: subscription.status,
      planType: subscription.planType,
      planCode: subscription.planCode,
      limits: subscription.limits,
      usage: { ...subscription.usage?.toObject?.() || subscription.usage, eventsThisPeriod },
      canCreateEvent,
      // Explicit invite fields for frontend
      guests: {
        limitPerEvent: subscription.limits?.maxInvitesPerEvent ?? subscription.limits?.maxGuestsPerEvent ?? 50,
        isUnlimited: (subscription.limits?.maxInvitesPerEvent ?? subscription.limits?.maxGuestsPerEvent) === -1,
      },
      events: {
        used: eventsThisPeriod,
        limit: maxEPM,
        remaining: maxEPM === -1 ? -1 : Math.max(0, maxEPM - eventsThisPeriod),
      },
    };
  }

  /**
   * Get single event stats
   * @param {string} eventId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getSingleEventStats(eventId, userId, isAdmin = false) {
    const query = isAdmin ? { _id: eventId } : { _id: eventId, host: userId };
    const event = await Event.findOne(query);
    if (!event) throw new NotFoundError("Event");

    const guests = await Guest.find({ event: eventId });

    return {
      eventId,
      totalGuests: guests.length,
      confirmed: guests.filter((g) => g.status === "confirmed").length,
      declined: guests.filter((g) => g.status === "declined").length,
      pending: guests.filter(
        (g) => g.status === "invited" || g.status === "maybe"
      ).length,
      checkedIn: guests.filter((g) => g.status === "checked_in").length,
    };
  }

  // ============================================
  // EXPORT
  // ============================================

  /**
   * Export events as Excel
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportEventsAsExcel(userId) {
    const { generateExcel } = require("../../shared/utils/excelExport");
    const events = await Event.find({ host: userId }).populate(
      "guestList",
      "status"
    );

    const data = events.map((e) => ({
      Title: e.eventDetails?.title || "",
      Type: e.eventDetails?.type || "",
      Date: e.eventDetails?.date
        ? new Date(e.eventDetails.date).toLocaleDateString()
        : "",
      Status: e.status,
      "Total Guests": e.guestList?.length || 0,
      Confirmed:
        e.guestList?.filter((g) => g.status === "confirmed").length || 0,
      Created: new Date(e.createdAt).toLocaleDateString(),
    }));

    return generateExcel(data, "events");
  }

  /**
   * Export event guests as Excel
   * @param {string} eventId
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportEventGuestsAsExcel(eventId, userId) {
    const { generateExcel } = require("../../shared/utils/excelExport");
    const event = await Event.findOne({ _id: eventId, host: userId })
      .populate({
        path: 'guestList',
        select: 'name email phone status rsvp checkIn invitation addedBy',
        populate: { path: 'addedBy', select: 'username email' },
      });

    if (!event) throw new NotFoundError("Event");

    const data = (event.guestList || []).map((g) => ({
      Name: g.name || "",
      Phone: g.phone || "",
      Email: g.email || "",
      Status: g.status || "invited",
      "Response Date": g.rsvp?.respondedAt
        ? new Date(g.rsvp.respondedAt).toLocaleString()
        : "",
      "Check-in Time": g.checkIn?.time
        ? new Date(g.checkIn.time).toLocaleString()
        : "",
      "Invitation Sent": g.invitation?.sent ? "Yes" : "No",
    }));

    return generateExcel(data, `event-${eventId}-guests`);
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Bulk delete events
   * @param {string[]} eventIds
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async bulkDeleteEvents(eventIds, userId) {
    const events = await Event.find({ _id: { $in: eventIds }, host: userId });
    const validIds = events.map((e) => e._id);

    await Guest.deleteMany({ event: { $in: validIds } });
    const result = await Event.deleteMany({ _id: { $in: validIds } });

    return { deletedCount: result.deletedCount };
  }

  // ============================================
  // PARTIAL UPDATES
  // ============================================

  /**
   * Update event details
   * @param {string} eventId
   * @param {Object} details
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateEventDetails(eventId, details, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    // Don't allow modifications to completed or cancelled events
    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    event.eventDetails = { ...event.eventDetails, ...details };
    await event.save();

    return { event };
  }

  /**
   * Update guest list
   * @param {string} eventId
   * @param {Array} guestList
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateGuestList(eventId, guestList, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId })
      .populate('guestList', 'name email phone status');
    if (!event) throw new NotFoundError("Event");

    // Enforce per-event guest limit against the new total (not cumulative)
    const newCount = guestList?.length || 0;
    const limit = event.guestLimit;
    if (limit && limit !== -1 && newCount > limit) {
      throw new PackageLimitError("guests", limit,
        `Guest list exceeds the limit of ${limit}.`);
    }

    // Build map of existing guests by normalized phone for O(1) lookup
    const existingGuests = event.guestList || [];
    const existingByPhone = new Map(
      existingGuests.map(g => [normalizePhoneNumber(g.phone), g])
    );

    const keptGuestIds = [];
    const toCreate = [];
    const incomingPhones = new Set();

    for (const incoming of (guestList || [])) {
      const normPhone = normalizePhoneNumber(incoming.phone);
      incomingPhones.add(normPhone);
      const existing = existingByPhone.get(normPhone);
      if (existing) {
        // Keep existing guest — preserves RSVP status, QR code, check-in history
        // Update name/email if the host changed them
        if (existing.name !== incoming.name || (incoming.email && existing.email !== incoming.email)) {
          await Guest.findByIdAndUpdate(existing._id, {
            name: incoming.name,
            ...(incoming.email && { email: incoming.email }),
          });
        }
        keptGuestIds.push(existing._id);
      } else {
        toCreate.push({
          name: incoming.name,
          phone: incoming.phone,
          email: incoming.email || '',
          event: eventId,
          status: 'invited',
          addedBy: userId,
        });
      }
    }

    // Delete guests that were removed from the UI
    const toDeleteIds = existingGuests
      .filter(g => !incomingPhones.has(normalizePhoneNumber(g.phone)))
      .map(g => g._id);
    if (toDeleteIds.length > 0) {
      await Guest.deleteMany({ _id: { $in: toDeleteIds } });
    }

    // Create only truly new guests (triggers QR code pre-save hook)
    const newGuests = toCreate.length > 0 ? await Guest.create(toCreate) : [];
    const newGuestIds = newGuests.map(g => g._id);

    // Full replace — not push
    event.guestList = [...keptGuestIds, ...newGuestIds];
    await event.save();

    // Track only the net-new guests on the subscription
    if (event.subscriptionId && newGuestIds.length > 0) {
      try {
        await Subscription.findByIdAndUpdate(event.subscriptionId, {
          $inc: { "usage.guestsUsed": newGuestIds.length, "usage.totalGuests": newGuestIds.length },
        });
      } catch (e) { console.error("Failed to track guest addition:", e); }
    }

    const updated = await Event.findById(eventId).populate(
      "guestList",
      "name email phone status"
    );
    return { event: updated, addedCount: newGuestIds.length };
  }

  /**
   * Replace the entire staff list for an event
   * @param {string} eventId
   * @param {Array} staffList - Array of {name, phone}
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateStaffList(eventId, staffList, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    // Don't allow modifications to completed or cancelled events
    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    event.staffList = (staffList || []).map((s) => ({
      name: s.name,
      phone: s.phone,
    }));
    await event.save();
    return { event };
  }

  /**
   * Update invitation settings
   * @param {string} eventId
   * @param {Object} settings
   * @param {string} userId
   * @param {Object} [file]
   * @returns {Promise<Object>}
   */
  async updateInvitationSettings(eventId, settings, userId, file) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    // Don't allow modifications to completed or cancelled events
    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    if (file) {
      const templateImagePath = getFileUrl(file);
      if (templateImagePath) settings.templateImage = templateImagePath;
    }

    event.invitationSettings = { ...event.invitationSettings, ...settings };

    await event.save();

    return { event };
  }

  /**
   * Update launch settings
   * @param {string} eventId
   * @param {Object} settings
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateLaunchSettings(eventId, settings, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    // Don't allow modifications to completed or cancelled events
    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    event.launchSettings = { ...event.launchSettings, ...settings };
    await event.save();

    return { event };
  }

  /**
   * Send test message
   * @param {string} eventId
   * @param {Object} messageData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async sendTestMessage(eventId, messageData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    const messagingService = require('../messaging/messaging.service');
    return messagingService.sendTestMessage({
      eventId,
      phoneNumber: messageData.phoneNumber || messageData.phone,
      channel: messageData.channel || 'sms',
    });
  }

  // ============================================
  // GUEST CRUD
  // ============================================

  /**
   * Add single guest to event
   * @param {string} eventId
   * @param {Object} guestData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async addGuestToEvent(eventId, guestData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    // Enforce per-event guest limit (Bug 6)
    const currentCount = event.guestList?.length || 0;
    const limit = event.guestLimit;
    if (limit && limit !== -1 && currentCount + 1 > limit) {
      throw new PackageLimitError("guests", limit, `Event guest limit of ${limit} reached.`);
    }

    const guest = await Guest.create({
      ...guestData,
      event: eventId,
      status: "invited",
      addedBy: userId,
    });

    event.guestList.push(guest._id);
    await event.save();

    return { guest };
  }

  /**
   * Update event guest
   * @param {string} eventId
   * @param {string} guestId
   * @param {Object} updateData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateEventGuest(eventId, guestId, updateData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    const allowedFields = ["name", "email", "phone", "status"];
    const update = {};
    allowedFields.forEach((f) => {
      if (updateData[f] !== undefined) update[f] = updateData[f];
    });

    const guest = await Guest.findOneAndUpdate(
      { _id: guestId, event: eventId },
      update,
      { new: true, runValidators: true }
    );

    if (!guest) throw new NotFoundError("Guest");
    return { guest };
  }

  /**
   * Delete event guest
   * @param {string} eventId
   * @param {string} guestId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteEventGuest(eventId, guestId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    const guest = await Guest.findOne({ _id: guestId, event: eventId });
    if (!guest) throw new NotFoundError("Guest");

    event.guestList = event.guestList.filter((id) => id.toString() !== guestId);
    await event.save();
    await Guest.findByIdAndDelete(guestId);
  }

  // ============================================
  // STAFF MANAGEMENT
  // ============================================

  /**
   * Add staff to event
   * @param {string} eventId
   * @param {Object} staffData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async addStaffToEvent(eventId, staffData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    if (!event.staffList) event.staffList = [];

    const staffMember = {
      name: staffData.name,
      phone: staffData.phone,
      status: SUPERVISOR_STATUS.ACTIVE,
      addedAt: new Date(),
    };

    event.staffList.push(staffMember);
    await event.save();

    return {
      staff: event.staffList[event.staffList.length - 1],
    };
  }

  /**
   * Update staff
   * @param {string} eventId
   * @param {string} staffId
   * @param {Object} updateData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateStaff(eventId, staffId, updateData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    const staffIndex = event.staffList?.findIndex(
      (s) => s._id?.toString() === staffId
    );
    if (staffIndex === -1 || staffIndex === undefined)
      throw new NotFoundError("Staff");

    const allowedFields = ["name", "phone", "status"];
    allowedFields.forEach((f) => {
      if (updateData[f] !== undefined)
        event.staffList[staffIndex][f] = updateData[f];
    });

    await event.save();
    return { staff: event.staffList[staffIndex] };
  }

  /**
   * Update staff status
   * @param {string} eventId
   * @param {string} staffId
   * @param {string} status
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateStaffStatus(eventId, staffId, status, userId) {
    return this.updateStaff(eventId, staffId, { status }, userId);
  }

  /**
   * Delete staff
   * @param {string} eventId
   * @param {string} staffId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteStaff(eventId, staffId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError("Event");

    const initialLength = event.staffList?.length || 0;
    event.staffList = (event.staffList || []).filter(
      (s) => s._id?.toString() !== staffId
    );

    if (event.staffList.length === initialLength)
      throw new NotFoundError("Staff");

    await event.save();
  }

  // ============================================
  // STAFF NOTIFICATION
  // ============================================

  /**
   * Send WhatsApp/SMS notification to all active staff
   * Generates access tokens and sends staff portal link
   * @param {string} eventId
   * @param {string} userId
   * @param {boolean} isAdmin
   * @returns {Promise<Object>} { sent, failed, total }
   */
  async notifyStaff(eventId, userId, isAdmin = false) {
    const query = isAdmin ? { _id: eventId } : { _id: eventId, host: userId };
    const event = await Event.findOne(query);
    if (!event) throw new NotFoundError("Event");

    const activeStaff = (event.staffList || []).filter(
      (s) => s.status === SUPERVISOR_STATUS.ACTIVE
    );

    if (activeStaff.length === 0) {
      throw new ValidationError("No active staff found for this event");
    }

    const frontendUrl = config.frontend.url;
    const eventTitle = event.eventDetails?.title || "Untitled";
    const eventDate = event.eventDetails?.date
      ? new Date(event.eventDetails.date).toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
    const eventLocation =
      event.eventDetails?.location?.address ||
      event.eventDetails?.location?.city ||
      "";

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const staffMember of activeStaff) {
      try {
        const tokenDoc = await StaffAccessToken.createForStaff(
          eventId,
          staffMember.phone,
          staffMember.name
        );

        const staffUrl = `${frontendUrl}/ar/staff?token=${tokenDoc.token}`;

        const message =
          `مرحبا ${staffMember.name}!\n\n` +
          `تم تعيينك كمشرف في فعالية "${eventTitle}"\n` +
          (eventDate ? `📅 التاريخ: ${eventDate}\n` : "") +
          (eventLocation ? `📍 المكان: ${eventLocation}\n` : "") +
          `\nللدخول لصفحة المشرفين:\n${staffUrl}`;

        await taqnyat.sendSMS(staffMember.phone, message);
        sent++;
        results.push({ name: staffMember.name, phone: staffMember.phone, status: "sent" });
      } catch (error) {
        failed++;
        results.push({
          name: staffMember.name,
          phone: staffMember.phone,
          status: "failed",
          error: error.message,
        });
      }
    }

    return { sent, failed, total: activeStaff.length, results };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Format event for response
   * @private
   */
  _formatEvent(event) {
    return {
      id: event._id,
      title: event.eventDetails?.title,
      eventType: event.eventDetails?.type,
      date: event.eventDetails?.date,
      time: event.eventDetails?.time,
      location: event.eventDetails?.location,
      status: event.status,
      guestCount: event.guestList?.length || 0,
      confirmedCount:
        event.guestList?.filter((g) => g.status === "confirmed").length || 0,
      createdAt: event.createdAt,
    };
  }

  /**
   * Format event for admin response
   * @private
   */
  _formatEventAdmin(event) {
    return {
      ...this._formatEvent(event),
      host: event.host
        ? {
          id: event.host._id,
          name: event.host.name || event.host.username,
          email: event.host.email,
          phoneNumber: event.host.phoneNumber,
        }
        : null,
    };
  }

  /**
   * Get host IDs for whitelabel
   * @private
   */
  async _getWhitelabelHostIds(whitelabelFilter) {
    const User = require("../../../models/UserModel");
    const hosts = await User.find({ ...whitelabelFilter, role: "host" }).select(
      "_id"
    );
    return hosts.map((h) => h._id);
  }

  /**
   * Notify about event status change
   * @private
   */
  async _notifyEventStatusChange(event, newStatus, actorId, isAdmin) {
    const eventTitle = event.eventDetails?.title || 'Untitled';
    const hostId = event.host;

    // Notify host (unless host is changing their own status - still notify for transparency)
    await notificationService.sendToUser(hostId, {
      type: 'event_status_change',
      title: 'Event Status Updated',
      titleAr: 'تم تحديث حالة المناسبة',
      message: `Your event "${eventTitle}" status changed to ${newStatus}.`,
      messageAr: `تم تغيير حالة مناسبتك "${eventTitle}" إلى ${newStatus}.`,
      data: { entityType: 'event', entityId: event._id, metadata: { newStatus } },
    });

    // Notify admins for significant status changes
    if (['live', 'completed', 'cancelled'].includes(newStatus)) {
      notificationService.sendToAdmins({
        type: 'event_status_change',
        title: 'Event Status Changed',
        titleAr: 'تم تغيير حالة مناسبة',
        message: `Event "${eventTitle}" status changed to ${newStatus}.`,
        messageAr: `مناسبة "${eventTitle}" تغيرت حالتها إلى ${newStatus}.`,
        data: { entityType: 'event', entityId: event._id, metadata: { newStatus } },
      }).catch(console.error);
    }
  }

  /**
   * Notify event created
   * @private
   */
  async _notifyEventCreated(event, userId, guestCount) {
    const frontendUrl = config.frontend.url;
    const eventTitle = event.eventDetails?.title || "Untitled";

    await notificationService.sendToUser(userId, {
      type: "event_created",
      title: "Event Created Successfully",
      titleAr: "تم إنشاء المناسبة بنجاح",
      message: `Your event "${eventTitle}" has been created with ${guestCount} guests.`,
      messageAr: `تم إنشاء مناسبتك "${eventTitle}" مع ${guestCount} ضيف.`,
      actionUrl: `${frontendUrl}/ar/host/events/${event._id}`,
      data: {
        entityType: "event",
        entityId: event._id,
        metadata: { eventId: event._id, eventTitle, guestCount },
      },
    });

    await notificationService.sendToAdmins({
      type: "event_created",
      title: "New Event Created",
      titleAr: "تم إنشاء مناسبة جديدة",
      message: `New event "${eventTitle}" created with ${guestCount} guests.`,
      messageAr: `مناسبة جديدة "${eventTitle}" تم إنشاؤها مع ${guestCount} ضيف.`,
      actionUrl: `${frontendUrl}/ar/admin-dash/events`,
      data: {
        entityType: "event",
        entityId: event._id,
      },
    });
  }
}

module.exports = new EventsService();

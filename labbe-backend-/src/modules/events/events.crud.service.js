/**
 * Events Service — CRUD sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.crud.service
 */

const { EVENT_STATUS } = require("../../shared/constants");
const { ROLES } = require("../../shared/constants/roles");
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
// Import existing services
const notificationService = require('../notifications/notifications.service');
const SubscriptionsService = require('../subscriptions/subscriptions.service');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');

module.exports = {
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
  },

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
  },

  /**
   * Build a scoped Mongo query for a single event lookup.
   *
   * Host-facing endpoints used to filter on `{ host: userId }` only, so a
   * whitelabel admin/moderator viewing the same event got 404 instead of
   * being scoped by their tenant. Roles:
   *
   *   - HOST                          → own event only
   *   - SUPER_ADMIN                   → any event
   *   - ADMIN, MODERATOR              → events whose `whitelabelId` matches
   *                                      the caller's `whitelabelId`
   *                                      (admin filters scope this way;
   *                                      we mirror the single-doc query
   *                                      for consistency).
   *   - WHITELABEL_ADMIN,
   *     WHITELABEL_MODERATOR          → same tenant scope
   *
   * Tenant-scoped roles MUST have a `whitelabelId`; otherwise we throw
   * 403 (fail closed). Mirrors the `filterByWhitelabel` middleware.
   *
   * @param {string} eventId
   * @param {Object} userContext - req.user shape: { _id, role, whitelabelId }
   * @returns {Object} Mongo query
   * @private
   */
  _buildScopedEventQuery(eventId, userContext) {
    const role = userContext?.role;
    const userId = userContext?._id?.toString?.() || userContext?._id;
    const whitelabelId = userContext?.whitelabelId
      ? userContext.whitelabelId.toString?.() || userContext.whitelabelId
      : null;

    // Defense in depth: callers always come through `protect` so this
    // should never fire, but if both role + id are absent we'd otherwise
    // fall into the host branch with `host: undefined` — Mongoose
    // coerces that to `host: null` which technically matches orphaned
    // documents. Fail closed instead of relying on the schema's `host:
    // required` invariant.
    if (!role && !userId) {
      throw new ForbiddenError("Authentication context is required");
    }

    if (role === ROLES.SUPER_ADMIN) {
      return { _id: eventId };
    }

    const tenantScoped = [
      ROLES.ADMIN,
      ROLES.MODERATOR,
      ROLES.WHITELABEL_ADMIN,
      ROLES.WHITELABEL_MODERATOR,
    ];
    if (tenantScoped.includes(role)) {
      if (!whitelabelId) {
        throw new ForbiddenError(
          "Tenant configuration error. Contact a super admin to assign a whitelabel."
        );
      }
      return { _id: eventId, whitelabelId };
    }

    // Default: host (or any other authenticated role) sees only their own.
    return { _id: eventId, host: userId };
  },

  /**
   * Get event by ID.
   *
   * Accepts the full user context so admins / whitelabel tier roles can
   * read events under their scope, not just the event host.
   *
   * @param {string} eventId
   * @param {Object} userContext - req.user
   * @returns {Promise<Object>}
   */
  async getEventById(eventId, userContext) {
    const query = this._buildScopedEventQuery(eventId, userContext);
    const event = await Event.findOne(query)
      // `rsvp` + `invitation` are needed by ScheduleReminderSection (filters
      // by rsvp.response / rsvp.responded) and by the guest-table reminder
      // badges. Without them, the picker shows zero eligible guests for the
      // confirmed bucket and the badges never light up.
      .populate("guestList", "name email phone status rsvp invitation")
      .populate("host", "username email phoneNumber")
      // Populate the canonical refs so the wizard can highlight the
      // saved template (Step 3) and show body text (Step 4) on edit.
      .populate({
        path: "visualTemplate.templateRef",
        select:
          "nameAr nameEn imageUrl thumbnailUrl naturalWidth naturalHeight fields overlays decorations categories",
      })
      .populate({
        path: "taqnyatTemplate.templateRef",
        select:
          "templateName bodyText hasImageHeader language category varMapping",
      })
      .lean();

    if (!event) {
      throw new NotFoundError("Event");
    }

    // Attach the event-OWNER's subscription summary so the UI gates the
    // "Schedule extra reminder" button on the host's quota — not on the
    // viewing admin's own subscription. Critical for admin-on-behalf flows.
    if (event.subscriptionId) {
      try {
        const sub = await Subscription.findById(event.subscriptionId)
          .select(
            "remindersPool remindersConsumed remindersReserved invitePool compensationPool invitesConsumed status expiresAt"
          )
          .lean();
        if (sub) {
          const remindersRemaining =
            (sub.remindersPool || 0) -
            (sub.remindersConsumed || 0) -
            (sub.remindersReserved || 0);
          const invitesRemaining =
            sub.invitePool === null
              ? null
              : (sub.invitePool || 0) +
                (sub.compensationPool || 0) -
                (sub.invitesConsumed || 0);
          event.subscription = {
            _id: sub._id,
            status: sub.status,
            expiresAt: sub.expiresAt,
            remindersPool: sub.remindersPool || 0,
            remindersConsumed: sub.remindersConsumed || 0,
            remindersReserved: sub.remindersReserved || 0,
            remindersRemaining,
            invitesRemaining,
          };
        }
      } catch (err) {
        // Best-effort enrichment — never break the event read because of it.
        logger.warn?.("[getEventById] subscription enrichment failed", {
          eventId: String(eventId),
          err: err?.message,
        });
      }
    }

    return { event };
  },

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

    if (
      whitelabelFilter &&
      whitelabelFilter.whitelabelId !== undefined &&
      whitelabelFilter.whitelabelId !== null
    ) {
      // Restrict to events hosted by users of this whitelabel
      query["host"] = {
        $in: await this._getWhitelabelHostIds(whitelabelFilter),
      };
    }
    // whitelabelId === null means platform admin → show ALL events (no host filter)

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
  },

  /**
   * Create event
   * @param {Object} eventData
   * @param {Array} guestList
   * @param {Object} context - { userId, userRole, subscription, file }
   * @returns {Promise<Object>}
   */
  async createEvent(eventData, guestList, context) {
    const { userId, userRole, subscription, file, skipSubscriptionCheck, whitelabelId, adminId } = context;

    // Validate event data
    if (!eventData.eventDetails) {
      throw new ValidationError("Event details are required");
    }

    if (!guestList || guestList.length === 0) {
      throw new ValidationError("At least one guest is required");
    }

    const guestCount = guestList.length;
    let poolConsumed = false;
    let capacitySub = null;

    if (!skipSubscriptionCheck) {
      // Whitelabel contexts with per-event plans: enforce the event limit
      // across ALL hosts under the whitelabel umbrella, not per-host.
      if (whitelabelId && subscription && isPerEventPlan(subscription.planId?.planType)) {
        const periodStart = subscription.getBillingPeriodStart
          ? subscription.getBillingPeriodStart()
          : subscription.activatedAt || subscription.createdAt;
        const whitelabelEventCount = await Event.countDocuments({
          whitelabelId,
          createdAt: { $gte: periodStart },
          status: { $nin: ['cancelled', 'draft'] },
        });
        if (whitelabelEventCount >= (subscription.limits?.maxEvents || 1)) {
          throw new PackageLimitError(
            'events',
            subscription.limits?.maxEvents || 1,
            'This whitelabel has reached its event limit for the current period'
          );
        }
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
            validation.limits?.maxEvents || 0
          );
        }
      }

      // Capacity check: handle pool vs per-event plans
      capacitySub = subscription
        ? (subscription.planId?.planType ? subscription : await Subscription.findById(subscription._id).populate('planId'))
        : await Subscription.getCapacityForEvent(userId, guestCount);

      if (!capacitySub) {
        throw new PackageLimitError(
          'subscription',
          0,
          'No active subscription with sufficient capacity'
        );
      }

      // Consume invites and create the event with a compensating return on
      // failure. We track whether we consumed (poolConsumed) and how much; if
      // anything between consumption and the final save throws, we release
      // the invites and rethrow.
      if (isPoolPlan(capacitySub.planId?.planType)) {
        await Subscription.consumeInvites(capacitySub._id, guestCount);
        poolConsumed = true;
      } else if (isPerEventPlan(capacitySub.planId?.planType)) {
        const maxInvites = capacitySub.planId?.limits?.maxInvitesPerEvent;
        if (maxInvites !== null && maxInvites !== undefined && guestCount > maxInvites) {
          throw new PackageLimitError(
            'guests',
            maxInvites,
            `Guest count exceeds plan limit of ${maxInvites}`
          );
        }
      }
    }

    try {
      if (!subscription && !skipSubscriptionCheck) {
        // Attach capacity subscription to eventData for tracking
        if (!eventData.subscriptionId) eventData.subscriptionId = capacitySub._id;
      }

      // Handle file upload — resolves correctly for both S3 (file.location) and local (file.path/filename)
      // Stored on the canonical `visualTemplate.bakedImagePath`. The
      // top-level `templateImage` field is kept as an optional
      // fallback for legacy reads.
      if (file) {
        const templateImagePath = getFileUrl(file);
        if (templateImagePath) {
          eventData.visualTemplate = {
            ...(eventData.visualTemplate || {}),
            bakedImagePath: templateImagePath,
          };
          eventData.templateImage = templateImagePath;
        }
      }

      // Drop any client-side `invitationSettings` mirror that may
      // sneak in from older builds — the schema no longer carries it
      // and Mongoose would silently ignore unknown keys, but stripping
      // here keeps payload logging clean.
      if (eventData.invitationSettings) delete eventData.invitationSettings;

      // Set host and tracking info
      eventData.host = userId;
      eventData.createdBy = {
        user: adminId || userId,
        role: userRole || "host",
        onBehalfOf: !!adminId && String(adminId) !== String(userId),
        createdAt: new Date(),
      };
      eventData.createdFor = {
        user: userId,
        role: userRole || "host",
        isSelf: true,
      };

      // Set whitelabelId from context when provided (admin/whitelabel creation)
      if (whitelabelId !== undefined) {
        eventData.whitelabelId = whitelabelId;
      }

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
      } else if (skipSubscriptionCheck) {
        eventData.guestLimit = -1;
      }

      // Validate host-supplied fieldValues against Template.fields[]
      // BEFORE persisting. Throws 400 with validationErrors[] on mismatch.
      if (eventData.visualTemplate?.templateRef) {
        await this._validateVisualTemplateFieldValues(
          eventData.visualTemplate.templateRef,
          eventData.visualTemplate.fieldValues || {}
        );
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

      this._notifyEventCreated(populatedEvent, userId, guestIds.length).catch(
        (e) => logger.warn('event creation notification failed', { err: e?.message })
      );

      // Audit event creation
      logAudit({
        action: 'event.created',
        actor: { _id: userId, role: userRole || 'host' },
        targetType: 'event',
        targetId: event._id,
        metadata: { guestCount: guestIds.length, onBehalfOf: false },
      }).catch(() => {});

      return { event: populatedEvent };
    } catch (err) {
      // Compensating return: roll back the pool debit so the user isn't
      // billed for an event that never landed. Failure here is logged but
      // does not mask the original error.
      if (poolConsumed) {
        try {
          await Subscription.releaseInvites(capacitySub._id, guestCount);
        } catch (releaseErr) {
          // When the compensating release ALSO fails, the pool stays
          // debited for an event that was never created. Without
          // reconciliation hooks, that capacity is silently lost. We:
          //   1. log loudly with both errors so on-call gets paged
          //   2. emit a `subscription.invite_pool_reconcile_pending` audit
          //      row that an admin reconciliation script can pick up
          //   3. notify admins out-of-band so the host doesn't lose
          //      capacity quietly
          logger.error(
            `[events.createEvent] FAILED to release ${guestCount} invites on subscription ${capacitySub._id} after Event.save error`,
            { err: releaseErr.message, originalError: err?.message }
          );
          try {
            await logAudit({
              action: "subscription.invite_pool_reconcile_pending",
              actor: { _id: userId, role: userRole || "host" },
              targetType: "subscription",
              targetId: capacitySub._id,
              metadata: {
                guestCount,
                originalError: err?.message,
                releaseError: releaseErr?.message,
              },
              status: "failure",
            });
          } catch (_) { /* swallow audit failure */ }
          try {
            const notificationService = require("../notifications/notifications.service");
            await notificationService.sendToAdmins({
              type: "invite_pool_reconcile_pending",
              title: "Invite pool reconciliation needed",
              titleAr: "حاجة إلى مطابقة رصيد الدعوات",
              message: `Subscription ${capacitySub._id} has ${guestCount} orphaned invites after a failed event creation.`,
              data: {
                entityType: "subscription",
                entityId: capacitySub._id,
                metadata: { guestCount },
              },
              priority: "high",
            });
          } catch (_) { /* swallow notify failure */ }
        }
      }
      throw err;
    }
  },

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
        logger.warn('Failed to release pool invites on cancellation', { err: e.message });
      }
    }

    // Notify about status change (non-blocking)
    this._notifyEventStatusChange(event, status, userId, isAdmin).catch((e) =>
      logger.warn('event status notification failed', { err: e?.message })
    );

    logAudit({
      action: isAdmin
        ? 'event.status_updated_by_admin'
        : 'event.status_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { status, isAdmin },
    }).catch(() => {});

    return { event };
  },

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
    }).catch((e) => logger.warn('admin notify on event delete failed', { err: e?.message }));

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
      }).catch((e) => logger.warn('host notify on event delete failed', { err: e?.message }));
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

    // Audit event deletion
    logAudit({
      action: 'event.deleted',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { title: eventTitle, deletedByAdmin: isAdmin },
    }).catch(() => {});
  },

  /**
   * Bulk delete events
   * @param {string[]} eventIds
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async bulkDeleteEvents(eventIds, userId) {
    const events = await Event.find({ _id: { $in: eventIds }, host: userId })
      .select('_id eventDetails.title')
      .lean();
    const validIds = events.map((e) => e._id);
    if (validIds.length === 0) return { deletedCount: 0 };

    const session = await require('mongoose').startSession();
    let deletedCount = 0;
    try {
      await session.withTransaction(async () => {
        await Guest.deleteMany({ event: { $in: validIds } }, { session });
        const result = await Event.deleteMany(
          { _id: { $in: validIds } },
          { session }
        );
        deletedCount = result.deletedCount;
      });
    } finally {
      await session.endSession();
    }

    logAudit({
      action: 'event.bulk_deleted',
      actor: { _id: userId },
      targetType: 'event',
      metadata: {
        deletedCount,
        eventIds: validIds.map((id) => id.toString()),
      },
    }).catch(() => {});

    return { deletedCount };
  },

  /**
   * Format event for response.
   *
   * Surfaces the launch-lifecycle fields (`attemptCount`,
   * `failureReason`, `failedAt`, `launchedAt`) so the failure-banner UI
   * has them in list-view and detail-view payloads. Without these, the
   * mobile EventDetails screen (which receives the event as a prop from
   * the list) renders an empty banner on `failed` events.
   */
  _formatEvent(event) {
    return {
      id: event._id,
      _id: event._id,
      title: event.eventDetails?.title,
      eventType: event.eventDetails?.type,
      date: event.eventDetails?.date,
      time: event.eventDetails?.time,
      location: event.eventDetails?.location,
      status: event.status,
      guestCount: event.guestList?.length || 0,
      confirmedCount:
        event.guestList?.filter((g) => g.status === "confirmed").length || 0,
      // Launch lifecycle
      attemptCount: event.attemptCount || 0,
      failureReason: event.failureReason || null,
      failedAt: event.failedAt || null,
      launchedAt: event.launchedAt || null,
      // Messaging status
      messagingStatus: event.messagingStatus ? {
        sentCount: event.messagingStatus.sentCount || 0,
        failedCount: event.messagingStatus.failedCount || 0,
        staffFailedCount: event.messagingStatus.staffFailedCount || 0,
      } : null,
      // Multi-tenant context (3c failure-banner RBAC needs this)
      whitelabelId: event.whitelabelId || null,
      host: event.host || null,
      createdAt: event.createdAt,
    };
  },

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
  },

  /**
   * Get host IDs for whitelabel
   * @private
   */
  async _getWhitelabelHostIds(whitelabelFilter) {
    const User = require("../../../models/UserModel");
    const { whitelabelId, ...rest } = whitelabelFilter;

    let roleFilter;
    if (whitelabelId === null) {
      const { PLATFORM_ADMIN_ROLES } = require("../../shared/constants/roles");
      roleFilter = { $in: [...PLATFORM_ADMIN_ROLES, "host"] };
    } else {
      roleFilter = "host";
    }

    const hosts = await User.find({ whitelabelId, ...rest, role: roleFilter }).select("_id");
    return hosts.map((h) => h._id);
  },
};

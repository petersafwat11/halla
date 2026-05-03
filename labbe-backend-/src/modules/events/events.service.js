/**
 * Events Service
 * Business logic for event management - NO HTTP concerns
 * @module modules/events/events.service
 */

const config = require("../../config");
const { EVENT_STATUS, SUPERVISOR_STATUS } = require("../../shared/constants");
const { ROLES } = require("../../shared/constants/roles");
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  PackageLimitError,
  AppError,
} = require("../../shared/errors");
// M-5: every export/notification helper uses formatRiyadh so we don't
// re-render UTC server-locale dates as the previous local day.
const { formatRiyadh } = require("../../shared/utils/timezone");

// Import existing models during migration
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const { isPoolPlan, isPerEventPlan } = require('../../shared/constants/plans');

// File upload helper
const { getFileUrl } = require('../../shared/utils/fileUpload');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
// Phase 4c W0-VISUAL-BACKEND — server-side validator for the host's
// per-template field values (per v4.1 §A-12). Lazily-required at the
// call site to keep boot-time cycles minimal.
const Template = require('../../../models/TemplateModel');
const { validateTemplateData } = require('./templateDataValidator');

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
  /**
   * Phase 4c W0-VISUAL-BACKEND — validate the host-supplied template
   * field values against the picked Template's `fields[]` definitions.
   *
   * Resolves `templateRef` (canonical) to the live Template doc, then
   * delegates to `validateTemplateData`. Throws AppError(400) with
   * `validationErrors[]` if the host's input fails — caller surfaces
   * to the wizard so the host fixes their entry before the save lands.
   *
   * Skips silently when:
   *   - no fieldValues / templateRef (legacy events / pre-Step-3 saves)
   *   - the referenced Template was soft-deleted (defense in depth —
   *     we don't want a deleted template to block updates to the rest
   *     of the event; legacy snapshot remains authoritative)
   *
   * @param {string|ObjectId} templateRef
   * @param {Object} fieldValues
   * @returns {Promise<void>}
   * @private
   */
  async _validateVisualTemplateFieldValues(templateRef, fieldValues) {
    if (!templateRef || !fieldValues || typeof fieldValues !== 'object') return;
    const tpl = await Template.findById(templateRef).lean();
    if (!tpl || tpl.deletedAt) return;
    validateTemplateData(tpl, fieldValues);
  }

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
   * Build a scoped Mongo query for a single event lookup.
   *
   * Phase 4b W0-RBAC: previously the host-facing endpoints filtered on
   * `{ host: userId }` only, so a whitelabel admin/moderator viewing the
   * same event got 404 instead of being scoped by their tenant. Roles:
   *
   *   - HOST                          → own event only
   *   - SUPER_ADMIN                   → any event
   *   - ADMIN, MODERATOR              → events whose `whitelabelId` matches
   *                                      the caller's `whitelabelId`
   *                                      (TENANT-F01 already scopes admin
   *                                      filters this way; we mirror the
   *                                      single-doc query for consistency).
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
  }

  /**
   * Get event by ID.
   *
   * Phase 4b W0-RBAC: accepts the full user context so admins / whitelabel
   * tier roles can read events under their scope, not just the event host.
   *
   * @param {string} eventId
   * @param {Object} userContext - req.user
   * @returns {Promise<Object>}
   */
  async getEventById(eventId, userContext) {
    const query = this._buildScopedEventQuery(eventId, userContext);
    const event = await Event.findOne(query)
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

    // PIPELINE-F03 (Phase 3a.4): consume invites and create the event with
    // a compensating return on failure. The previous flow debited the pool
    // before `Event.save()` ever ran, so a save failure left the user with
    // their pool quota silently consumed and no event to show for it.
    //
    // Approach: track whether we consumed (poolConsumed) and what we
    // consumed (capacitySub._id, guestCount). If anything between
    // consumption and the *final* save throws, release the invites and
    // rethrow.
    let poolConsumed = false;
    if (isPoolPlan(capacitySub.planId?.planType)) {
      await Subscription.consumeInvites(capacitySub._id, guestCount);
      poolConsumed = true;
    } else if (isPerEventPlan(capacitySub.planId?.planType)) {
      const maxInvites = capacitySub.planId?.limits?.maxInvitesPerEvent;
      if (maxInvites !== null && maxInvites !== undefined && guestCount > maxInvites) {
        throw new Error(`Guest count exceeds plan limit of ${maxInvites}`);
      }
    }

    try {
      if (!subscription) {
        // Attach capacity subscription to eventData for tracking
        if (!eventData.subscriptionId) eventData.subscriptionId = capacitySub._id;
      }

      // Handle file upload — resolves correctly for both S3 (file.location) and local (file.path/filename)
      //
      // Phase 4c W0-RENAME: dual-write the baked header image into both
      // the legacy `invitationSettings.templateImage` AND the canonical
      // `visualTemplate.bakedImagePath` so reads from either shape
      // resolve correctly during the dual-write window.
      if (file) {
        const templateImagePath = getFileUrl(file);
        if (templateImagePath) {
          if (eventData.invitationSettings) {
            eventData.invitationSettings.templateImage = templateImagePath;
          } else {
            eventData.invitationSettings = { templateImage: templateImagePath };
          }
          eventData.visualTemplate = {
            ...(eventData.visualTemplate || {}),
            bakedImagePath: templateImagePath,
          };
        }
      }

      // Phase 4c W0-RENAME: project legacy keys submitted by older
      // clients into the canonical fields, and vice versa.
      if (eventData.invitationSettings) {
        const inv = eventData.invitationSettings;
        if (inv.visualTemplate) {
          eventData.visualTemplate = {
            templateRef: inv.visualTemplate.id ?? eventData.visualTemplate?.templateRef,
            fieldValues: inv.visualTemplate.data ?? eventData.visualTemplate?.fieldValues ?? {},
            bakedImagePath:
              inv.visualTemplate.src ??
              eventData.visualTemplate?.bakedImagePath ??
              inv.templateImage ??
              null,
          };
        }
        if (inv.selectedTemplate) {
          eventData.taqnyatTemplate = {
            templateRef: inv.selectedTemplate.id ?? eventData.taqnyatTemplate?.templateRef,
          };
        }
        eventData.guestReplies = {
          onAttend: inv.attendanceAutoReply ?? eventData.guestReplies?.onAttend,
          onAbsent: inv.absenceAutoReply ?? eventData.guestReplies?.onAbsent,
          onExpected: inv.expectedAttendanceAutoReply ?? eventData.guestReplies?.onExpected,
        };
        if (inv.note !== undefined) eventData.hostNote = inv.note;
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

      // Phase 4c W0-VISUAL-BACKEND — validate host-supplied
      // fieldValues against Template.fields[] BEFORE persisting (per
      // v4.1 §A-12). Throws 400 with validationErrors[] on mismatch.
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

      // Send notifications (non-blocking)
      this._notifyEventCreated(populatedEvent, userId, guestIds.length).catch(
        console.error
      );

      return { event: populatedEvent };
    } catch (err) {
      // Compensating return: roll back the pool debit so the user isn't
      // billed for an event that never landed. Failure here is logged but
      // does not mask the original error.
      if (poolConsumed) {
        try {
          await Subscription.releaseInvites(capacitySub._id, guestCount);
        } catch (releaseErr) {
          // M-22: when the compensating release ALSO fails, the pool stays
          // debited for an event that was never created. Without
          // reconciliation hooks, that capacity is silently lost. We now:
          //   1. log loudly with both errors so on-call gets paged
          //   2. emit a `subscription.invite_pool_reconcile_pending` audit
          //      row that an admin reconciliation script can pick up
          //   3. notify admins out-of-band so the host doesn't lose
          //      capacity quietly
          // eslint-disable-next-line no-console
          console.error(
            `[events.createEvent] FAILED to release ${guestCount} invites on subscription ${capacitySub._id} after Event.save error:`,
            releaseErr.message
          );
          try {
            const { logAudit } = require("../../shared/utils/auditLog");
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
  }

  // ============================================
  // EVENT UPDATES
  // ============================================

  /**
   * Manual launch retry (Phase 3c.1, FLOW-15-F04).
   *
   * Permitted for the host (event creator), the whitelabel-admin who owns
   * the event's whitelabel, or any global admin / super-admin (the route
   * already restricts to those roles via `restrictTo`).
   *
   * Behavior: clears `attemptCount` and `failureReason`, flips status from
   * `failed` → `scheduled`, then immediately runs the launch sequence.
   * The same `runEventLaunch` helper used by the cron is reused so the
   * lock + audit semantics match.
   */
  async retryEventLaunch(eventId, userContext) {
    const event = await Event.findById(eventId);
    if (!event) throw new NotFoundError("Event");

    const userId = userContext._id?.toString() || userContext._id;
    const role = userContext.role;

    const isHost = event.host?.toString() === userId;
    const isAdmin = ["admin", "super_admin"].includes(role);
    const isWhitelabelAdmin =
      role === "whitelabel_admin" &&
      event.whitelabelId &&
      userContext.whitelabelId &&
      event.whitelabelId.toString() === userContext.whitelabelId.toString();

    if (!isHost && !isAdmin && !isWhitelabelAdmin) {
      throw new ForbiddenError("Not authorized to retry this event");
    }

    if (event.status !== "failed" && event.status !== "scheduled") {
      // 409 — conflict with the resource's current state. We don't have a
      // ConflictError class, so build an AppError directly with the right
      // status code (the global error handler reads statusCode, not the
      // string status field).
      const AppError = require("../../shared/errors/AppError");
      throw new AppError(
        `Cannot retry an event in status '${event.status}'`,
        409,
        "EVENT_NOT_RETRYABLE"
      );
    }

    event.attemptCount = 0;
    // Mongoose treats `undefined` as a no-op on assignment; use `null` to
    // explicitly clear the persisted value. (Worth using $unset if we
    // ever need true "field absent" semantics — for our queries `null`
    // suffices.)
    event.failureReason = null;
    event.failedAt = null;
    event.status = "scheduled";
    event.lastAttemptAt = null;
    await event.save();

    // Reuse the same launch helper as the cron — same lock, same audit.
    const { runEventLaunch } = require("../../shared/utils/scheduledTasks");
    const result = await runEventLaunch(event, `manual:${userId}`);

    const { logAudit } = require("../../shared/utils/auditLog");
    await logAudit({
      action: "event.launch_manual_retry",
      actor: userContext,
      targetType: "event",
      targetId: event._id,
      whitelabelId: event.whitelabelId || null,
      metadata: {
        triggeredBy: userId,
        triggeredByRole: role,
        outcome: result.launched ? "launched" : result.reason,
      },
    });

    return { ...result, eventId: event._id };
  }

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
   * Get single event stats.
   *
   * Phase 4b W0-RBAC: tenant-scoped via `_buildScopedEventQuery` so
   * whitelabel-admin/moderator can poll stats for their own events.
   *
   * @param {string} eventId
   * @param {Object} userContext - req.user
   * @returns {Promise<Object>}
   */
  async getSingleEventStats(eventId, userContext) {
    const query = this._buildScopedEventQuery(eventId, userContext);
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
      // M-5: render in Asia/Riyadh wall-clock so admins on a UTC server
      // don't see Riyadh-evening events on the previous calendar day.
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
        ? formatRiyadh(g.rsvp.respondedAt) // M-5
        : "",
      "Check-in Time": g.checkIn?.time
        ? formatRiyadh(g.checkIn.time) // M-5
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
   * Update event details.
   *
   * Phase 4b W1-UNIFY: accepts the full user context so the unified
   * update wizard works for admin / whitelabel-admin / whitelabel-moderator,
   * not only the host. Scope resolution mirrors `getEventById` via
   * `_buildScopedEventQuery`.
   *
   * @param {string} eventId
   * @param {Object} details
   * @param {Object} userContext - req.user
   * @returns {Promise<Object>}
   */
  async updateEventDetails(eventId, details, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
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
  async updateGuestList(eventId, guestList, userContext) {
    // userId is used downstream as `addedBy` on net-new guests; pull it
    // out of the context whether we got the legacy ObjectId or the full
    // req.user shape.
    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext))
      .populate('guestList', 'name email phone status');
    if (!event) throw new NotFoundError("Event");

    // Enforce per-event guest limit against the new total (not cumulative)
    const newCount = guestList?.length || 0;
    const limit = event.guestLimit;
    if (limit && limit !== -1 && newCount > limit) {
      throw new PackageLimitError("guests", limit,
        `Guest list exceeds the limit of ${limit}.`);
    }

    // Phase 4b W0-RBAC (inventory 03 §5 gap 2 / Bug #6): the guest-list
    // editor can drop a guest the host has already removed in the UI, but
    // it must not let the new total fall below the count of guests who
    // already confirmed (or already checked in). Doing so would silently
    // delete confirmed RSVPs and leave the host with a smaller list than
    // the number of attendees they're expecting.
    //
    // The middleware guard `checkGuestLimit` only protects against
    // exceeding the plan ceiling; this guards the floor.
    const confirmedCount = (event.guestList || []).filter((g) =>
      ['confirmed', 'checked_in'].includes(g.status)
    ).length;
    if (confirmedCount > 0 && newCount < confirmedCount) {
      throw new AppError(
        `Cannot reduce guest list below ${confirmedCount} confirmed guests.`,
        400,
        'GUEST_LIST_BELOW_CONFIRMED'
      );
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
  async updateStaffList(eventId, staffList, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
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
   * Phase 4d W0-ATOMIC — atomically replace guest list + staff list.
   *
   * Wraps the same business rules as `updateGuestList` + `updateStaffList`
   * inside a Mongo transaction so a capacity-guard rejection on either
   * side leaves both fields at their pre-call values. On a standalone
   * Mongo topology (no replica set) `session.startTransaction()` throws
   * `MongoServerError: Transaction numbers are only allowed on a replica
   * set member or mongos`; we catch that, fall back to ordered writes,
   * and rollback the guest changes by hand if the staff write fails
   * (D4d-3).
   *
   * Reuses the Phase 4b W0-RBAC `GUEST_LIST_BELOW_CONFIRMED` capacity
   * guard so the floor check (no shrink below confirmed/checked-in
   * guests) fires before any writes land.
   *
   * @param {string} eventId
   * @param {{ guestList: Array, staffList: Array }} payload
   * @param {Object} userContext - req.user
   * @returns {Promise<{ event: Object, addedCount: number }>}
   */
  async updateEventStep2(eventId, payload, userContext) {
    const guestList = Array.isArray(payload?.guestList) ? payload.guestList : [];
    const staffList = Array.isArray(payload?.staffList) ? payload.staffList : [];

    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext))
      .populate('guestList', 'name email phone status');
    if (!event) throw new NotFoundError("Event");

    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    // Plan ceiling — net total must fit under the per-event guest limit.
    const newCount = guestList.length;
    const limit = event.guestLimit;
    if (limit && limit !== -1 && newCount > limit) {
      throw new PackageLimitError("guests", limit,
        `Guest list exceeds the limit of ${limit}.`);
    }

    // Floor — never drop below confirmed/checked-in count.
    const confirmedCount = (event.guestList || []).filter((g) =>
      ['confirmed', 'checked_in'].includes(g.status)
    ).length;
    if (confirmedCount > 0 && newCount < confirmedCount) {
      throw new AppError(
        `Cannot reduce guest list below ${confirmedCount} confirmed guests.`,
        400,
        'GUEST_LIST_BELOW_CONFIRMED'
      );
    }

    // Pre-image — kept for the compensation path and for the response
    // shape on either branch.
    const preImageGuestIds = (event.guestList || []).map((g) => g._id);
    const preImageStaffList = (event.staffList || []).map((s) => ({
      name: s.name,
      phone: s.phone,
    }));

    // Reusable helpers: compute the diff between the existing guests and
    // the incoming list. Defined once so both the transaction branch and
    // the compensation branch see identical behaviour.
    const existingGuests = event.guestList || [];
    const existingByPhone = new Map(
      existingGuests.map((g) => [normalizePhoneNumber(g.phone), g])
    );
    const keptGuestIds = [];
    const toCreate = [];
    const toUpdate = [];
    const incomingPhones = new Set();

    for (const incoming of guestList) {
      const normPhone = normalizePhoneNumber(incoming.phone);
      incomingPhones.add(normPhone);
      const existing = existingByPhone.get(normPhone);
      if (existing) {
        if (existing.name !== incoming.name || (incoming.email && existing.email !== incoming.email)) {
          toUpdate.push({
            _id: existing._id,
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
    const toDeleteIds = existingGuests
      .filter((g) => !incomingPhones.has(normalizePhoneNumber(g.phone)))
      .map((g) => g._id);

    const normalisedStaff = staffList.map((s) => ({
      name: s.name,
      phone: s.phone,
    }));

    let session = null;
    let useTransactions = true;
    try {
      session = await require('mongoose').startSession();
      session.startTransaction();
    } catch (err) {
      // Standalone topology — no transactions. Fall back to compensation.
      useTransactions = false;
      try { if (session) await session.endSession(); } catch (_) { /* ignore */ }
      session = null;
    }

    let addedCount = 0;

    try {
      if (useTransactions) {
        // Happy path — replica-set / sharded cluster.
        if (toDeleteIds.length > 0) {
          await Guest.deleteMany({ _id: { $in: toDeleteIds } }, { session });
        }
        for (const u of toUpdate) {
          await Guest.findByIdAndUpdate(
            u._id,
            { name: u.name, ...(u.email !== undefined && { email: u.email }) },
            { session }
          );
        }
        const newGuestIds = [];
        if (toCreate.length > 0) {
          // Guest pre-save hook (QR generation) needs `Guest.create`; insertMany skips hooks.
          const created = await Guest.create(toCreate, { session, ordered: true });
          for (const g of created) newGuestIds.push(g._id);
        }
        addedCount = newGuestIds.length;

        event.guestList = [...keptGuestIds, ...newGuestIds];
        event.staffList = normalisedStaff;
        await event.save({ session });

        if (event.subscriptionId && newGuestIds.length > 0) {
          await Subscription.findByIdAndUpdate(
            event.subscriptionId,
            {
              $inc: {
                "usage.guestsUsed": newGuestIds.length,
                "usage.totalGuests": newGuestIds.length,
              },
            },
            { session }
          );
        }

        await session.commitTransaction();
      } else {
        // Standalone / no-transaction path. Order matters: write guests
        // first, then staff. If staff fails, restore the guest pre-image.
        if (toDeleteIds.length > 0) {
          await Guest.deleteMany({ _id: { $in: toDeleteIds } });
        }
        for (const u of toUpdate) {
          await Guest.findByIdAndUpdate(
            u._id,
            { name: u.name, ...(u.email !== undefined && { email: u.email }) }
          );
        }
        const newGuestIds = [];
        const createdDocs = [];
        if (toCreate.length > 0) {
          const created = await Guest.create(toCreate);
          for (const g of created) {
            newGuestIds.push(g._id);
            createdDocs.push(g);
          }
        }
        addedCount = newGuestIds.length;

        const guestIdsBeforeStaff = [...keptGuestIds, ...newGuestIds];
        event.guestList = guestIdsBeforeStaff;
        await event.save();

        try {
          event.staffList = normalisedStaff;
          await event.save();
        } catch (staffErr) {
          // Compensation: revert the guest list to its pre-image and
          // delete the freshly-created guest docs.
          try {
            // Re-load to dodge any version-mismatch from the failed save.
            const restoreEvent = await Event.findById(eventId);
            if (restoreEvent) {
              restoreEvent.guestList = preImageGuestIds;
              restoreEvent.staffList = preImageStaffList;
              await restoreEvent.save();
            }
            if (newGuestIds.length > 0) {
              await Guest.deleteMany({ _id: { $in: newGuestIds } });
            }
            // Restore deleted guests if we removed any. Without a
            // session-level rollback, deleted Guest documents are gone;
            // attempting to recreate them here is best-effort using the
            // pre-image data we still have.
            if (toDeleteIds.length > 0) {
              const preImageDeleted = existingGuests.filter((g) =>
                toDeleteIds.some((id) => id.toString() === g._id.toString())
              );
              if (preImageDeleted.length > 0) {
                await Guest.create(
                  preImageDeleted.map((g) => ({
                    _id: g._id,
                    name: g.name,
                    phone: g.phone,
                    email: g.email || '',
                    event: eventId,
                    status: g.status || 'invited',
                    addedBy: userId,
                  }))
                );
              }
            }
          } catch (rollbackErr) {
            console.error('[updateEventStep2] compensation rollback failed:', rollbackErr);
          }
          throw staffErr;
        }

        if (event.subscriptionId && newGuestIds.length > 0) {
          try {
            await Subscription.findByIdAndUpdate(event.subscriptionId, {
              $inc: {
                "usage.guestsUsed": newGuestIds.length,
                "usage.totalGuests": newGuestIds.length,
              },
            });
          } catch (e) {
            console.error("[updateEventStep2] Failed to track guest addition:", e);
          }
        }
      }
    } catch (err) {
      if (useTransactions && session) {
        try { await session.abortTransaction(); } catch (_) { /* ignore */ }
      }
      throw err;
    } finally {
      if (session) {
        try { await session.endSession(); } catch (_) { /* ignore */ }
      }
    }

    const updated = await Event.findById(eventId).populate(
      "guestList",
      "name email phone status"
    );
    return { event: updated, addedCount };
  }

  /**
   * Update invitation settings
   * @param {string} eventId
   * @param {Object} settings
   * @param {string} userId
   * @param {Object} [file]
   * @returns {Promise<Object>}
   */
  async updateInvitationSettings(eventId, settings, userContext, file) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError("Event");

    // Don't allow modifications to completed or cancelled events
    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    if (file) {
      const templateImagePath = getFileUrl(file);
      if (templateImagePath) settings.templateImage = templateImagePath;
    }

    // Phase 4c W0-RENAME — DUAL WRITE.
    //
    // The wizard may submit either the legacy `invitationSettings.*`
    // shape (older clients) or the canonical top-level shape (new
    // clients), or a mix during the dual-write window. We accept both
    // and write both so reads from either shape resolve correctly until
    // the legacy field is dropped in Phase 5.
    //
    // Canonical → legacy projections (read-back compatibility):
    //   visualTemplate.templateRef     → invitationSettings.visualTemplate.id
    //   visualTemplate.bakedImagePath  → invitationSettings.templateImage
    //   visualTemplate.fieldValues     → invitationSettings.visualTemplate.data
    //   taqnyatTemplate.templateRef    → invitationSettings.selectedTemplate (resolved)
    //   guestReplies.onAttend          → invitationSettings.attendanceAutoReply
    //   guestReplies.onAbsent          → invitationSettings.absenceAutoReply
    //   guestReplies.onExpected        → invitationSettings.expectedAttendanceAutoReply
    //   hostNote                       → invitationSettings.note
    //
    // Legacy → canonical projections work in reverse during the same write.
    const legacyMerge = { ...(event.invitationSettings?.toObject?.() || event.invitationSettings || {}) };
    const canonicalVisual = { ...(event.visualTemplate?.toObject?.() || event.visualTemplate || {}) };
    const canonicalTaqnyat = { ...(event.taqnyatTemplate?.toObject?.() || event.taqnyatTemplate || {}) };
    const canonicalReplies = { ...(event.guestReplies?.toObject?.() || event.guestReplies || {}) };

    // Apply incoming legacy keys — back-fill the canonical side too.
    if (settings.visualTemplate !== undefined) {
      legacyMerge.visualTemplate = settings.visualTemplate;
      if (settings.visualTemplate?.id) canonicalVisual.templateRef = settings.visualTemplate.id;
      if (settings.visualTemplate?.src) canonicalVisual.bakedImagePath = settings.visualTemplate.src;
      if (settings.visualTemplate?.data) canonicalVisual.fieldValues = settings.visualTemplate.data;
    }
    if (settings.selectedTemplate !== undefined) {
      legacyMerge.selectedTemplate = settings.selectedTemplate;
      if (settings.selectedTemplate?.id) canonicalTaqnyat.templateRef = settings.selectedTemplate.id;
    }
    if (settings.templateImage !== undefined) {
      legacyMerge.templateImage = settings.templateImage;
      canonicalVisual.bakedImagePath = settings.templateImage;
    }
    if (settings.attendanceAutoReply !== undefined) {
      legacyMerge.attendanceAutoReply = settings.attendanceAutoReply;
      canonicalReplies.onAttend = settings.attendanceAutoReply;
    }
    if (settings.absenceAutoReply !== undefined) {
      legacyMerge.absenceAutoReply = settings.absenceAutoReply;
      canonicalReplies.onAbsent = settings.absenceAutoReply;
    }
    if (settings.expectedAttendanceAutoReply !== undefined) {
      legacyMerge.expectedAttendanceAutoReply = settings.expectedAttendanceAutoReply;
      canonicalReplies.onExpected = settings.expectedAttendanceAutoReply;
    }
    if (settings.note !== undefined) {
      legacyMerge.note = settings.note;
      event.hostNote = settings.note;
    }

    // Apply incoming canonical keys — back-fill the legacy side too.
    if (settings.visualTemplateRef !== undefined || settings.fieldValues !== undefined || settings.bakedImagePath !== undefined) {
      if (settings.visualTemplateRef !== undefined) canonicalVisual.templateRef = settings.visualTemplateRef;
      if (settings.fieldValues !== undefined) canonicalVisual.fieldValues = settings.fieldValues;
      if (settings.bakedImagePath !== undefined) canonicalVisual.bakedImagePath = settings.bakedImagePath;
      legacyMerge.visualTemplate = {
        ...(legacyMerge.visualTemplate || {}),
        id: canonicalVisual.templateRef,
        src: canonicalVisual.bakedImagePath,
        data: canonicalVisual.fieldValues,
      };
      if (canonicalVisual.bakedImagePath) legacyMerge.templateImage = canonicalVisual.bakedImagePath;
    }
    if (settings.taqnyatTemplateRef !== undefined) {
      canonicalTaqnyat.templateRef = settings.taqnyatTemplateRef;
      legacyMerge.selectedTemplate = { ...(legacyMerge.selectedTemplate || {}), id: settings.taqnyatTemplateRef };
    }
    if (settings.guestReplies && typeof settings.guestReplies === "object") {
      Object.assign(canonicalReplies, settings.guestReplies);
      if (settings.guestReplies.onAttend !== undefined) legacyMerge.attendanceAutoReply = settings.guestReplies.onAttend;
      if (settings.guestReplies.onAbsent !== undefined) legacyMerge.absenceAutoReply = settings.guestReplies.onAbsent;
      if (settings.guestReplies.onExpected !== undefined) legacyMerge.expectedAttendanceAutoReply = settings.guestReplies.onExpected;
    }
    if (settings.invitationMessage !== undefined) {
      event.invitationMessage = settings.invitationMessage;
    }
    if (settings.hostNote !== undefined) {
      event.hostNote = settings.hostNote;
      legacyMerge.note = settings.hostNote;
    }

    // Phase 4c W0-VISUAL-BACKEND — validate fieldValues against
    // Template.fields[] BEFORE the save commits (per v4.1 §A-12).
    if (canonicalVisual.templateRef && canonicalVisual.fieldValues) {
      await this._validateVisualTemplateFieldValues(
        canonicalVisual.templateRef,
        canonicalVisual.fieldValues
      );
    }

    event.invitationSettings = legacyMerge;
    event.visualTemplate = canonicalVisual;
    event.taqnyatTemplate = canonicalTaqnyat;
    event.guestReplies = canonicalReplies;

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
  async updateLaunchSettings(eventId, settings, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
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
  async sendTestMessage(eventId, messageData, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
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
    // M-5: Asia/Riyadh wall-clock with explicit timeZone option.
    const eventDate = event.eventDetails?.date
      ? formatRiyadh(event.eventDetails.date, { style: "date", locale: "ar-SA" })
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
   * Format event for response.
   *
   * Phase 3c: surface the launch-lifecycle fields (`attemptCount`,
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
      // Launch lifecycle (Phase 3a/3c)
      attemptCount: event.attemptCount || 0,
      failureReason: event.failureReason || null,
      failedAt: event.failedAt || null,
      launchedAt: event.launchedAt || null,
      // Multi-tenant context (3c failure-banner RBAC needs this)
      whitelabelId: event.whitelabelId || null,
      host: event.host || null,
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

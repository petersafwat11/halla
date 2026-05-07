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
const { formatRiyadh, parseEventTime } = require("../../shared/utils/timezone");

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
// Phase 4c hardening — resolves legacy `inv.selectedTemplate.id` (Meta
// taqnyatId string) and `inv.visualTemplate.id` (legacy Number) into
// canonical ObjectId refs without throwing CastError on dual-write.
const {
  resolveTaqnyatTemplateRef,
  resolveVisualTemplateRef,
} = require('./templateRefResolver');
// Post-review polish — extracted error codes shared between
// updateGuestList and updateEventStep2 so they can't drift.
const { GUEST_LIST_BELOW_CONFIRMED, EVENT_EDIT_LOCKED } = require('../../shared/constants/events');

// Import existing services
const notificationService = require('../notifications/notifications.service');
const SubscriptionsService = require('../subscriptions/subscriptions.service');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
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

    // FLOW-11-F03: deduplicate by normalized phone — keep last occurrence
    const seen = new Map();
    for (const guest of guestData) {
      const key = normalizePhoneNumber(guest.phone);
      seen.set(key, guest);
    }

    const docs = Array.from(seen.values()).map(guest => ({
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
      .populate("host", "username email phoneNumber")
      .lean();

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
          validation.limits?.maxEvents || 0
        );
      }
    }

    // Capacity check: handle pool vs per-event plans
    const guestCount = guestList.length;
    const capacitySub = subscription
      ? await Subscription.findById(subscription._id).populate('planId')
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
    let poolConsumed = false;
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
      //
      // Hardening (post-review): legacy ids are not ObjectIds — Number
      // for visualTemplate, Meta taqnyatId for selectedTemplate.
      // `templateRefResolver` resolves them safely; missing/unresolvable
      // ids leave the canonical ref empty (read paths fall back to legacy).
      if (eventData.invitationSettings) {
        const inv = eventData.invitationSettings;
        if (inv.visualTemplate) {
          const resolvedVisualRef = resolveVisualTemplateRef(
            inv.visualTemplate.id ?? eventData.visualTemplate?.templateRef
          );
          eventData.visualTemplate = {
            ...(resolvedVisualRef ? { templateRef: resolvedVisualRef } : {}),
            fieldValues: inv.visualTemplate.data ?? eventData.visualTemplate?.fieldValues ?? {},
            bakedImagePath:
              inv.visualTemplate.src ??
              eventData.visualTemplate?.bakedImagePath ??
              inv.templateImage ??
              null,
          };
        }
        if (inv.selectedTemplate) {
          const resolvedTaqnyatRef = await resolveTaqnyatTemplateRef(
            inv.selectedTemplate.id ?? eventData.taqnyatTemplate?.templateRef
          );
          if (resolvedTaqnyatRef) {
            eventData.taqnyatTemplate = { templateRef: resolvedTaqnyatRef };
          }
        }
        eventData.guestReplies = {
          onAttend: inv.attendanceAutoReply ?? eventData.guestReplies?.onAttend,
          onAbsent: inv.absenceAutoReply ?? eventData.guestReplies?.onAbsent,
          onExpected: inv.expectedAttendanceAutoReply ?? eventData.guestReplies?.onExpected,
        };
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

      this._notifyEventCreated(populatedEvent, userId, guestIds.length).catch(
        (e) => logger.warn('event creation notification failed', { err: e?.message })
      );

      // FLOW-13-F05 / Track-B: audit event creation
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
          // M-22: when the compensating release ALSO fails, the pool stays
          // debited for an event that was never created. Without
          // reconciliation hooks, that capacity is silently lost. We now:
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
    const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
    const isWhitelabelAdmin =
      role === ROLES.WHITELABEL_ADMIN &&
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

    // FLOW-13-F04: extended status block list
    if (
      [EVENT_STATUS.LIVE, EVENT_STATUS.PUBLISHED, EVENT_STATUS.COMPLETED,
       EVENT_STATUS.CANCELLED, EVENT_STATUS.ARCHIVED].includes(event.status)
    ) {
      throw new ValidationError(`Cannot update event when status is '${event.status}'`);
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

    // FLOW-13-F05 / Track-B: audit event update
    logAudit({
      action: 'event.updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: event._id,
      metadata: { updatedFields: Object.keys(updateData) },
    }).catch(() => {});

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

    // FLOW-13-F05 / Track-B: audit event deletion
    logAudit({
      action: 'event.deleted',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { title: eventTitle, deletedByAdmin: isAdmin },
    }).catch(() => {});
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

    if (!capacitySub) {
      throw new PackageLimitError(
        'subscription',
        0,
        'No active subscription with sufficient capacity'
      );
    }

    if (isPoolPlan(capacitySub.planId?.planType)) {
      await Subscription.consumeInvites(capacitySub._id, newGuestCount);
    } else if (isPerEventPlan(capacitySub.planId?.planType)) {
      const maxInvites = capacitySub.planId?.limits?.maxInvitesPerEvent;
      if (maxInvites !== null && maxInvites !== undefined && newGuestCount > maxInvites) {
        throw new PackageLimitError(
          'guests',
          maxInvites,
          `Guest count exceeds plan limit of ${maxInvites}`
        );
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
    const event = await Event.findOne(query).populate("host", "username email phoneNumber name");
    if (!event) throw new NotFoundError("Event");

    const guests = await Guest.find({ event: eventId });

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
        const guestObj = g.toObject ? g.toObject() : g;
        return {
          guestId: guestObj._id,
          name: guestObj.name || "",
          phone: guestObj.phone || "",
          email: guestObj.email || "",
          status: guestObj.status || "invited",
          addedBy: guestObj.addedBy || "",
          respondAt: guestObj.rsvp?.respondedAt || null,
        };
      }),
      staff: eventObj.staffList || [],
      subscription: eventObj.subscription || null,
      eventDetails: eventObj.eventDetails || null,
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
  }

  /**
   * Export event guests as Excel
   * @param {string} eventId
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportEventGuestsAsExcel(eventId, userId) {
    const { generateExcel, guardExportMaxRows } = require("../../shared/utils/excelExport");
    const event = await Event.findOne({ _id: eventId, host: userId })
      .populate({
        path: 'guestList',
        select: 'name email phone status rsvp checkIn invitation addedBy',
        populate: { path: 'addedBy', select: 'username email' },
      })
      .lean();

    if (!event) throw new NotFoundError("Event");

    const guestCount = event.guestList?.length || 0;
    guardExportMaxRows(guestCount, 'guests');

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

    // FLOW-13-F04: extended status block list — live/published events are immutable
    const BLOCKED_STATUSES = ['live', 'published', 'completed', 'cancelled', 'archived'];
    if (BLOCKED_STATUSES.includes(event.status)) {
      throw new ValidationError(`Cannot modify event details when status is '${event.status}'`);
    }

    // FLOW-13-F01: 24h pre-launch edit lock
    this._checkEditLock(event, details);

    event.eventDetails = { ...event.eventDetails, ...details };
    await event.save();

    // FLOW-13-F05: audit event details update
    logAudit({
      action: 'event.details_updated',
      actor: userContext,
      targetType: 'event',
      targetId: event._id,
      metadata: { updatedFields: Object.keys(details) },
    }).catch(() => {});

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
        GUEST_LIST_BELOW_CONFIRMED
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

    // Soft-delete guests removed from the UI (FLOW-13-F02: tombstone, not hard delete)
    const toDeleteIds = existingGuests
      .filter(g => !incomingPhones.has(normalizePhoneNumber(g.phone)))
      .map(g => g._id);
    if (toDeleteIds.length > 0) {
      await Guest.updateMany(
        { _id: { $in: toDeleteIds } },
        { $set: { deleted: true, deletedAt: new Date() } }
      );
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
      } catch (e) {
        logger.warn('Failed to track guest addition on subscription', { err: e?.message });
      }
    }

    const updated = await Event.findById(eventId).populate(
      "guestList",
      "name email phone status"
    );

    logAudit({
      action: 'event.guest_list_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        addedCount: newGuestIds.length,
        removedCount: toDeleteIds.length,
        keptCount: keptGuestIds.length,
        totalCount: updated.guestList.length,
      },
    }).catch(() => {});

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

    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    const preImagePhones = (event.staffList || []).map((s) => s.phone);
    event.staffList = (staffList || []).map((s) => ({
      name: s.name,
      phone: s.phone,
    }));
    await event.save();

    // Revoke StaffAccessToken records for any phone dropped from the list
    // so removed staff lose portal access immediately (D-R3).
    await this._revokeRemovedStaffTokens(eventId, preImagePhones, event.staffList);

    logAudit({
      action: 'event.staff_list_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        previousCount: preImagePhones.length,
        newCount: event.staffList.length,
      },
    }).catch(() => {});

    return { event };
  }

  /**
   * D-R3 hardening — invalidate StaffAccessToken records for staff
   * removed from an event's staffList.
   *
   * Phone strings on `staffList` and on the token records are stored
   * in raw form (the entry the host typed). We normalise both sides
   * by stripping spaces / dashes / parentheses (matches
   * `staff.service` cleanPhone) so a phone like "+966 55 123 4567"
   * still matches "+966551234567" when revoking.
   *
   * @private
   */
  async _revokeRemovedStaffTokens(eventId, preImagePhones, newStaffList) {
    try {
      const cleanPhone = (p) => (typeof p === 'string' ? p.replace(/[\s\-\(\)]/g, '') : '');
      const newPhones = new Set(
        (newStaffList || []).map((s) => cleanPhone(s?.phone)).filter(Boolean)
      );
      const removedPhones = (preImagePhones || [])
        .map(cleanPhone)
        .filter((p) => p && !newPhones.has(p));
      if (removedPhones.length === 0) return;

      // Query the active tokens for this event and filter in-memory by
      // the cleaned phone — done in JS rather than via a complex regex
      // $in so phone-format drift between record and list (raw vs
      // formatted) doesn't leak access. The active-token set per event
      // is small (one per staff member, plus historical revoked ones),
      // so this is fine.
      const activeTokens = await StaffAccessToken.find({
        event: eventId,
        isRevoked: false,
      })
        .select('_id phone')
        .lean();

      const tokenIdsToRevoke = activeTokens
        .filter((t) => removedPhones.includes(cleanPhone(t.phone)))
        .map((t) => t._id);
      if (tokenIdsToRevoke.length === 0) return;

      await StaffAccessToken.updateMany(
        { _id: { $in: tokenIdsToRevoke } },
        { $set: { isRevoked: true, revokedAt: new Date() } }
      );
    } catch (err) {
      // Non-fatal — the staffList update already committed. Log so an
      // operator can re-revoke manually if needed.
      logger.warn('_revokeRemovedStaffTokens failed', { err: err?.message });
    }
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
        GUEST_LIST_BELOW_CONFIRMED
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
          // FLOW-13-F02: soft-delete tombstone
          await Guest.updateMany(
            { _id: { $in: toDeleteIds } },
            { $set: { deleted: true, deletedAt: new Date() } },
            { session }
          );
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

        // D-R3 hardening — revoke tokens for removed staff. Done AFTER
        // the transaction commits because StaffAccessToken writes are
        // outside the event-doc transaction scope and we don't want a
        // commit blocked on a side-effect collection.
        await this._revokeRemovedStaffTokens(eventId, preImageStaffList.map((s) => s.phone), normalisedStaff);
      } else {
        // Standalone / no-transaction path. Order matters and the delete
        // is DEFERRED until the staff save succeeds — this preserves
        // each existing guest document's `qrcode`, `rsvp`, `checkIn`,
        // and any other fields not loaded into the populated event
        // (only name/email/phone/status are populated above). If we
        // deleted-then-restored on rollback we'd regenerate the QR via
        // GuestModel's pre-save hook, which would invalidate any
        // invitation links already shared.
        //
        // Sequence:
        //   1. Update kept guests in place. Stash pre-image so we can
        //      restore the name/email on rollback (best-effort).
        //   2. Create the brand-new guests.
        //   3. Save the event with guestList = [kept, new] — the
        //      to-delete docs still exist in the Guest collection but
        //      are no longer referenced by the event.
        //   4. Save the event again with the new staffList. On failure
        //      we restore the event guestList + staffList to pre-image
        //      and delete the freshly-created guests; the to-delete
        //      docs are untouched.
        //   5. After step 4 commits, deleteMany the to-delete guests.
        //      If the process crashes between 4 and 5, an orphan Guest
        //      doc is left referenced by no event; the periodic guest-
        //      orphan GC sweep handles that.

        const guestById = new Map(
          existingGuests.map((g) => [g._id.toString(), g])
        );
        const updatePreImages = new Map();
        const newGuestIds = [];

        // D-R4 hardening (post-review) — unified rollback handler.
        // Pass 1 of the original hardening protected only the staff-save
        // failure window. The in-place updates (step 1) and the
        // first event.save() (step 3) ALSO had no rollback — a throw
        // anywhere in steps 1-3 left the DB with orphan guests and
        // mutated names, with no compensation. This handler restores
        // every step that had committed by the time the throw happened.
        const runCompensation = async (failedAt) => {
          try {
            // Always: drop the freshly-created guests (whatever step we
            // failed at, anything in newGuestIds is unwanted).
            if (newGuestIds.length > 0) {
              try {
                await Guest.deleteMany({ _id: { $in: newGuestIds } });
              } catch (_) { /* best-effort */ }
            }

            // Always: restore the in-place updates (best-effort — they
            // commit one-at-a-time, so partial restoration is possible).
            for (const [guestId, pre] of updatePreImages.entries()) {
              try {
                await Guest.findByIdAndUpdate(guestId, {
                  name: pre.name,
                  ...(pre.email !== undefined && { email: pre.email }),
                });
              } catch (_) { /* best-effort */ }
            }

            // Only when we'd advanced past step 3 (event.save with
            // new guestList): restore the event doc. If we failed AT
            // step 3, the event save threw and the document is still
            // pre-image in the DB — no restore needed.
            if (failedAt === 'staff-save') {
              const restoreEvent = await Event.findById(eventId);
              if (restoreEvent) {
                restoreEvent.guestList = preImageGuestIds;
                restoreEvent.staffList = preImageStaffList;
                await restoreEvent.save();
              }
            }
            // NOTE: we never delete the to-delete guests in compensation
            // paths — that's the whole point of the deferred-delete
            // sequencing (preserves QR codes / RSVP / checkIn).
          } catch (rollbackErr) {
            logger.error(
              `[updateEventStep2] compensation rollback (failedAt=${failedAt}) failed`,
              { err: rollbackErr?.message }
            );
          }
        };

        // Step 1: in-place updates (with pre-image stash).
        try {
          for (const u of toUpdate) {
            const existing = guestById.get(u._id.toString());
            if (existing) {
              updatePreImages.set(existing._id.toString(), {
                name: existing.name,
                email: existing.email,
              });
            }
            await Guest.findByIdAndUpdate(
              u._id,
              { name: u.name, ...(u.email !== undefined && { email: u.email }) }
            );
          }
        } catch (updateErr) {
          await runCompensation('inplace-update');
          throw updateErr;
        }

        // Step 2: create the brand-new guests.
        try {
          if (toCreate.length > 0) {
            const created = await Guest.create(toCreate);
            for (const g of created) newGuestIds.push(g._id);
          }
        } catch (createErr) {
          await runCompensation('guest-create');
          throw createErr;
        }
        addedCount = newGuestIds.length;

        // Step 3: event.guestList = [kept, new] (excludes toDeleteIds).
        try {
          event.guestList = [...keptGuestIds, ...newGuestIds];
          await event.save();
        } catch (firstSaveErr) {
          await runCompensation('first-event-save');
          throw firstSaveErr;
        }

        // Step 4: event.staffList = newStaff. Roll back on failure
        // through the same handler (which now knows to restore the
        // event doc since step 3 committed).
        try {
          event.staffList = normalisedStaff;
          await event.save();
        } catch (staffErr) {
          await runCompensation('staff-save');
          throw staffErr;
        }

        // Step 5: soft-delete the removed guests (FLOW-13-F02: tombstone, preserves QR/RSVP/checkIn).
        if (toDeleteIds.length > 0) {
          try {
            await Guest.updateMany(
              { _id: { $in: toDeleteIds } },
              { $set: { deleted: true, deletedAt: new Date() } }
            );
          } catch (deleteErr) {
            logger.warn('[updateEventStep2] post-commit guest soft-delete failed', { err: deleteErr?.message });
          }
        }

        // D-R3 hardening — revoke tokens for removed staff. Reaches
        // here only after step 4 (staff save) committed.
        await this._revokeRemovedStaffTokens(eventId, preImageStaffList.map((s) => s.phone), normalisedStaff);

        if (event.subscriptionId && newGuestIds.length > 0) {
          try {
            await Subscription.findByIdAndUpdate(event.subscriptionId, {
              $inc: {
                "usage.guestsUsed": newGuestIds.length,
                "usage.totalGuests": newGuestIds.length,
              },
            });
          } catch (e) {
            logger.warn('[updateEventStep2] Failed to track guest addition', { err: e?.message });
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
    //
    // Legacy → canonical projections work in reverse during the same write.
    const legacyMerge = { ...(event.invitationSettings?.toObject?.() || event.invitationSettings || {}) };
    const canonicalVisual = { ...(event.visualTemplate?.toObject?.() || event.visualTemplate || {}) };
    const canonicalTaqnyat = { ...(event.taqnyatTemplate?.toObject?.() || event.taqnyatTemplate || {}) };
    const canonicalReplies = { ...(event.guestReplies?.toObject?.() || event.guestReplies || {}) };

    // Apply incoming legacy keys — back-fill the canonical side too.
    //
    // Hardening: legacy ids are not ObjectIds. Resolve them via
    // `templateRefResolver` so the canonical write doesn't CastError.
    if (settings.visualTemplate !== undefined) {
      legacyMerge.visualTemplate = settings.visualTemplate;
      if (settings.visualTemplate?.id) {
        const resolvedVisualRef = resolveVisualTemplateRef(settings.visualTemplate.id);
        if (resolvedVisualRef) canonicalVisual.templateRef = resolvedVisualRef;
      }
      if (settings.visualTemplate?.src) canonicalVisual.bakedImagePath = settings.visualTemplate.src;
      if (settings.visualTemplate?.data) canonicalVisual.fieldValues = settings.visualTemplate.data;
    }
    if (settings.selectedTemplate !== undefined) {
      legacyMerge.selectedTemplate = settings.selectedTemplate;
      if (settings.selectedTemplate?.id) {
        const resolvedTaqnyatRef = await resolveTaqnyatTemplateRef(settings.selectedTemplate.id);
        if (resolvedTaqnyatRef) canonicalTaqnyat.templateRef = resolvedTaqnyatRef;
      }
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

    // Apply incoming canonical keys — back-fill the legacy side too.
    // Defensively resolve in case a client sends a non-ObjectId value.
    if (settings.visualTemplateRef !== undefined || settings.fieldValues !== undefined || settings.bakedImagePath !== undefined) {
      if (settings.visualTemplateRef !== undefined) {
        const resolvedVisualRef = resolveVisualTemplateRef(settings.visualTemplateRef);
        if (resolvedVisualRef) canonicalVisual.templateRef = resolvedVisualRef;
      }
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
      const resolvedTaqnyatRef = await resolveTaqnyatTemplateRef(settings.taqnyatTemplateRef);
      if (resolvedTaqnyatRef) {
        canonicalTaqnyat.templateRef = resolvedTaqnyatRef;
        legacyMerge.selectedTemplate = { ...(legacyMerge.selectedTemplate || {}), id: settings.taqnyatTemplateRef };
      }
    }
    if (settings.guestReplies && typeof settings.guestReplies === "object") {
      Object.assign(canonicalReplies, settings.guestReplies);
      if (settings.guestReplies.onAttend !== undefined) legacyMerge.attendanceAutoReply = settings.guestReplies.onAttend;
      if (settings.guestReplies.onAbsent !== undefined) legacyMerge.absenceAutoReply = settings.guestReplies.onAbsent;
      if (settings.guestReplies.onExpected !== undefined) legacyMerge.expectedAttendanceAutoReply = settings.guestReplies.onExpected;
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

    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    logAudit({
      action: 'event.invitation_settings_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { changedKeys: Object.keys(settings || {}) },
    }).catch(() => {});

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

    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    // 24h pre-launch edit lock — block scheduledDate/time changes within the window.
    this._checkEditLock(event, {
      date: settings.scheduledDate,
      time: settings.scheduledTime,
    });

    event.launchSettings = { ...event.launchSettings, ...settings };
    await event.save();

    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    logAudit({
      action: 'event.launch_settings_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { changedKeys: Object.keys(settings || {}) },
    }).catch(() => {});

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
    const result = await messagingService.sendTestMessage({
      eventId,
      phoneNumber: messageData.phoneNumber || messageData.phone,
      channel: messageData.channel || 'sms',
    });

    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    logAudit({
      action: 'event.test_message_sent',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        phoneNumber: messageData.phoneNumber || messageData.phone,
        channel: messageData.channel || 'sms',
      },
    }).catch(() => {});

    return result;
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

    logAudit({
      action: 'event.guest_added',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { guestId: guest._id, guestName: guest.name },
    }).catch(() => {});

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

    logAudit({
      action: 'event.guest_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { guestId, changes: update },
    }).catch(() => {});

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

    logAudit({
      action: 'event.guest_deleted',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { guestId, guestName: guest.name },
    }).catch(() => {});
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

    const added = event.staffList[event.staffList.length - 1];

    logAudit({
      action: 'event.staff_added',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { staffId: added._id, staffName: added.name, staffPhone: added.phone },
    }).catch(() => {});

    return { staff: added };
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
    const changes = {};
    allowedFields.forEach((f) => {
      if (updateData[f] !== undefined) {
        event.staffList[staffIndex][f] = updateData[f];
        changes[f] = updateData[f];
      }
    });

    await event.save();

    logAudit({
      action: 'event.staff_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { staffId, changes },
    }).catch(() => {});

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

    const removed = (event.staffList || []).find(
      (s) => s._id?.toString() === staffId
    );
    if (!removed) throw new NotFoundError("Staff");

    const removedPhone = removed.phone;
    event.staffList = (event.staffList || []).filter(
      (s) => s._id?.toString() !== staffId
    );

    await event.save();

    // D-R3: revoke any active StaffAccessToken so the removed staff loses
    // portal access immediately rather than at natural 48h TTL.
    if (removedPhone) {
      await this._revokeRemovedStaffTokens(eventId, [removedPhone], event.staffList);
    }

    logAudit({
      action: 'event.staff_deleted',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { staffId, staffName: removed.name, staffPhone: removedPhone },
    }).catch(() => {});

    return { staffId };
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
        // FLOW-20-F02: track staff SMS failures for host dashboard visibility
        event.messagingStatus = event.messagingStatus || {};
        event.messagingStatus.staffFailedCount = (event.messagingStatus.staffFailedCount || 0) + 1;
        await event.save().catch(() => {});
        results.push({
          name: staffMember.name,
          phone: staffMember.phone,
          status: "failed",
          error: error.message,
        });
      }
    }

    logAudit({
      action: 'event.notify_staff',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { sent, failed, total: activeStaff.length },
    }).catch(() => {});

    return { sent, failed, total: activeStaff.length, results };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * FLOW-13-F01: 24h pre-launch edit lock.
   *
   * Rejects changes to date/time/location when the event is `scheduled`
   * and launch is within 24 hours. Cosmetic fields (title, notes) are
   * always allowed.
   *
   * Uses `parseEventTime` for timezone-safe comparison (Asia/Riyadh
   * wall-clock → UTC instant).
   *
   * @param {Object} event - Event document
   * @param {Object} [changes] - proposed changes (to detect locked-field writes)
   * @throws {AppError} 422 EVENT_EDIT_LOCKED if locked
   */
  _checkEditLock(event, changes = {}) {
    if (event.status !== EVENT_STATUS.SCHEDULED) return;

    const LOCK_FIELDS = ['date', 'time', 'location'];
    const changingLockedField = LOCK_FIELDS.some(f => changes[f] !== undefined);
    if (!changingLockedField) return;

    const launchDate = event.launchSettings?.scheduledDate || event.eventDetails?.date;
    if (!launchDate) return;

    const scheduledUTC = parseEventTime(event);
    if (!scheduledUTC) return;

    const now = new Date();
    const hoursUntilLaunch = (scheduledUTC.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilLaunch > 0 && hoursUntilLaunch < 24) {
      const err = new AppError(
        'Event date, time, and location cannot be changed within 24 hours of the scheduled launch.',
        422,
        EVENT_EDIT_LOCKED
      );
      err.details = {
        hoursUntilLaunch: Math.round(hoursUntilLaunch * 10) / 10,
        scheduledAt: scheduledUTC.toISOString(),
      };
      throw err;
    }
  }

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
      // Messaging status (Phase 4b + FLOW-20-F02)
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
      }).catch((e) => logger.warn('admin notify on status change failed', { err: e?.message }));
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

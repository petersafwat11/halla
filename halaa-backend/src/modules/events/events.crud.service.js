/**
 * Events Service — CRUD sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.crud.service
 */

const { EVENT_STATUS, INVITATION_TYPE, isPerEventPlan, isPoolPlan } = require("../../shared/constants");
const { ROLES } = require("../../shared/constants/roles");
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  PackageLimitError,
} = require("../../shared/errors");

const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const User = require("../../../models/UserModel");
const { ACCOUNT_TYPES } = require("../../shared/constants");
const { copyS3Object, deleteFromS3 } = require("../../shared/utils/s3Upload");
const mongoose = require("mongoose");
const {
  isTrialFromPlan,
  eventInstantOf,
  assertEventDateFloor,
} = require('../../shared/utils/schedulingWindow');

// File upload helper
const { getFileUrl } = require('../../shared/utils/fileUpload');
// Import existing services
const notificationService = require('../notifications/notifications.service');
const SubscriptionsService = require('../subscriptions/subscriptions.service');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const taqnyatTemplatesService = require('../taqnyat-templates/taqnyat-templates.service');

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

    // Soft-deleted events are tombstones — never surface them in the host's
    // list. A status filter (below) never asks for 'deleted', so it's safe to
    // let an explicit status override this.
    let query = { host: userId, status: { $ne: EVENT_STATUS.DELETED } };

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
   * Roles:
   *
   *   - HOST                          → own event only
   *   - SUPER_ADMIN, ADMIN, MODERATOR → any event (platform-wide)
   *
   * @param {string} eventId
   * @param {Object} userContext - req.user shape: { _id, role }
   * @returns {Object} Mongo query
   * @private
   */
  _buildScopedEventQuery(eventId, userContext) {
    const role = userContext?.role;
    const userId = userContext?._id?.toString?.() || userContext?._id;

    // Defense in depth: callers always come through `protect` so this
    // should never fire, but if both role + id are absent we'd otherwise
    // fall into the host branch with `host: undefined` — Mongoose
    // coerces that to `host: null` which technically matches orphaned
    // documents. Fail closed instead of relying on the schema's `host:
    // required` invariant.
    if (!role && !userId) {
      throw new ForbiddenError("Authentication context is required");
    }

    // super_admin / admin / moderator may view or edit ANY event
    // platform-wide.
    const platformWide = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR];
    if (platformWide.includes(role)) {
      return { _id: eventId };
    }

    // Default: host (or any other authenticated role) sees only their own.
    return { _id: eventId, host: userId };
  },

  /**
   * Get event by ID.
   *
   * Accepts the full user context so admins / moderators / super_admin can
   * read any event, not just the event host.
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
      .populate("guestList", "name phone category status rsvp invitation")
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

    // Attach the event-OWNER's subscription summary so the UI gates
    // pool-charged actions (resend invite / extra reminder) on the host's
    // remaining invites — not on the viewing admin's own subscription.
    // Critical for admin-on-behalf flows.
    if (event.subscriptionId) {
      try {
        const sub = await Subscription.findById(event.subscriptionId)
          .select(
            "invitePool compensationPool invitesConsumed status expiresAt planId"
          )
          .populate("planId", "planType code limits name")
          .lean();
        if (sub) {
          const invitePool = sub.invitePool ?? null;
          const compensationPool = sub.compensationPool || 0;
          const invitesConsumed = sub.invitesConsumed || 0;
          const invitesRemaining =
            invitePool === null
              ? null
              : Math.max(0, invitePool + compensationPool - invitesConsumed);
          const planType = sub.planId?.planType || null;
          const isPerEvent = isPerEventPlan(planType);
          const isPool = isPoolPlan(planType);
          const isTrial = isTrialFromPlan(sub.planId);

          event.subscription = {
            _id: sub._id,
            status: sub.status,
            expiresAt: sub.expiresAt,
            invitePool,
            invitesRemaining,
            isPoolPlan: isPool,
            isSingleEvent: isPerEvent,
            isGuestUnlimited: invitePool === null && !isPerEvent,
            guestLimit:
              invitePool !== null
                ? invitePool + compensationPool
                : (event.guestLimit || -1),
            planType,
            planCode: sub.planId?.code || null,
            isTrial,
          };

          event.capabilities = {
            eventId: event._id,
            hostId: event.host?._id || event.host,
            subscriptionId: sub._id,
            hasSubscription: true,
            status: sub.status,
            planType,
            planCode: sub.planId?.code || null,
            isSingleEvent: isPerEvent,
            isPoolPlan: isPool,
            isTrial,
            invitePool,
            invitesRemaining,
            isGuestUnlimited: invitePool === null && !isPerEvent,
            guestLimit:
              invitePool !== null
                ? invitePool + compensationPool
                : (event.guestLimit || -1),
            eventStatus: event.status,
            isLive: event.status === EVENT_STATUS.LIVE,
            isCompleted: event.status === EVENT_STATUS.COMPLETED,
            isCancelled: event.status === EVENT_STATUS.CANCELLED,
            isTerminal: [
              EVENT_STATUS.COMPLETED,
              EVENT_STATUS.CANCELLED,
              EVENT_STATUS.DELETED,
              EVENT_STATUS.FAILED,
              EVENT_STATUS.ARCHIVED,
            ].includes(event.status),
            canEditEvent: ![
              EVENT_STATUS.COMPLETED,
              EVENT_STATUS.CANCELLED,
              EVENT_STATUS.DELETED,
              EVENT_STATUS.FAILED,
              EVENT_STATUS.ARCHIVED,
            ].includes(event.status),
            allowAddOnly: event.status === EVENT_STATUS.LIVE,
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
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getAllEvents(filters = {}, options = {}) {
    const { search, status, hostId, from, to } = filters;
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    let query = { status: { $ne: 'deleted' } };

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
      query.host = hostId;
    }
    if (from || to) {
      query["eventDetails.date"] = {};
      if (from) query["eventDetails.date"].$gte = new Date(from);
      if (to) query["eventDetails.date"].$lte = new Date(to);
    }

    let statusQuery = { status: { $ne: 'deleted' } };
    if (search) {
      const searchQuery = this.buildSearchQuery(search, [
        "eventDetails.title",
        "eventDetails.type",
      ]);
      statusQuery = { ...statusQuery, ...searchQuery };
    }
    if (hostId) {
      statusQuery.host = hostId;
    }
    if (from || to) {
      statusQuery["eventDetails.date"] = {};
      if (from) statusQuery["eventDetails.date"].$gte = new Date(from);
      if (to) statusQuery["eventDetails.date"].$lte = new Date(to);
    }

    const [events, total, statusAgg] = await Promise.all([
      Event.find(query)
        .populate("host", "username email phoneNumber name")
        .select('-guestList')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
      Event.aggregate([
        { $match: statusQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const rawStatusCounts = {};
    statusAgg.forEach((s) => { rawStatusCounts[s._id] = s.count; });
    const live = rawStatusCounts.live || 0;
    const scheduled = rawStatusCounts.scheduled || 0;
    const active = live + scheduled;
    const completed = rawStatusCounts.completed || 0;
    const cancelled = rawStatusCounts.cancelled || 0;
    const pending_scheduling = rawStatusCounts.pending_scheduling || 0;

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
      statusCounts: {
        total,
        active,
        scheduled,
        live,
        completed,
        cancelled,
        pending_scheduling,
        ...rawStatusCounts,
      },
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
    const { userId, userRole, subscription, file, skipSubscriptionCheck, adminId } = context;

    // Validate event data
    if (!eventData.eventDetails) {
      throw new ValidationError("Event details are required");
    }

    if (!guestList || guestList.length === 0) {
      throw new ValidationError("At least one guest is required");
    }

    const guestCount = guestList.length;
    let capacitySub = null;

    if (!skipSubscriptionCheck) {
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

      // List cap (NO consumption): a guest is free to add. Capacity is the
      // subscription's total pool (invitePool + compensation) for both
      // per-event and pool plans (they differ only by maxEvents). Sending is
      // what consumes, gated separately at send time. Unlimited plans
      // (invitePool null) have no cap.
      if (capacitySub.invitePool !== null && capacitySub.invitePool !== undefined) {
        const capacity = (capacitySub.invitePool || 0) + (capacitySub.compensationPool || 0);
        if (guestCount > capacity) {
          throw new PackageLimitError(
            'guests',
            capacity,
            `Guest count (${guestCount}) exceeds your plan capacity of ${capacity} invites`
          );
        }
      }
    }

    // Event-date floor: a valid scheduling window must exist for this plan,
    // i.e. eventInstant ≥ now + minLead(plan) + 3 days. Trial gets the looser
    // bound (now+3d+15min); paid ≈ now+4d. Indeterminate plan (skipped
    // subscription check) → fail-closed to paid. Throws EVENT_DATE_TOO_SOON.
    {
      const planLike =
        subscription?.planId?.planType !== undefined
          ? subscription.planId
          : capacitySub?.planId;
      const isTrial = isTrialFromPlan(planLike);
      const eventInstant = eventInstantOf({ eventDetails: eventData.eventDetails });
      assertEventDateFloor({ eventInstant, isTrial });
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

      // Custom-upload mode: the host supplied their own invitation
      // image directly (no predefined Template, no form fields). Drop
      // any stale templateRef / fieldValues so a partial client send
      // can't leave the document in a mixed state, and skip the
      // template-fields validation entirely.
      if (eventData.visualTemplate?.isCustomUpload) {
        eventData.visualTemplate = {
          isCustomUpload: true,
          bakedImagePath: eventData.visualTemplate.bakedImagePath || null,
          fieldValues: {},
        };
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

      // Set subscription reference. Event-level guestLimit is no longer the
      // capacity source — the subscription pool (invitePool + compensation)
      // governs for both per-event and pool plans, so freeze it to -1
      // (unlimited at the event level).
      if (subscription) {
        eventData.subscriptionId = subscription._id;
        eventData.planId = subscription.planId?._id || subscription.planId;
        eventData.guestLimit = -1;
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

      // Freeze a valid Step-4 contract at creation time. Category, invitation
      // mode, and the approved template's real WhatsApp controls must agree.
      await taqnyatTemplatesService.assertInviteTemplateCompatible(
        eventData.taqnyatTemplate?.templateRef,
        {
          category: eventData.eventDetails?.type,
          invitationMode: eventData.invitationType || INVITATION_TYPE.REPLY_AND_QR,
        }
      );

      // ─── Business-account branding + delivery SNAPSHOT (server-owned) ───
      // Deterministic delivery mode + (for business hosts) an immutable logo
      // copy + snapshotted business name. Pre-generate the event _id so the
      // copied S3 key is event-owned. Reject creation if the copy fails; the
      // copied object is cleaned up if the event create later throws.
      const owner = await User.findById(userId).select('accountType name avatar');
      const preEventId = new mongoose.Types.ObjectId();
      eventData._id = preEventId;
      let copiedLogoKey = null;
      if (owner?.accountType === ACCOUNT_TYPES.BUSINESS) {
        eventData.invitationDeliveryMode = 'portal_link';
        let logoKey = null;
        if (owner.avatar) {
          const ext = owner.avatar.includes('.') ? owner.avatar.split('.').pop() : 'png';
          const destKey = `events/${preEventId}/branding/logo.${ext}`;
          logoKey = await copyS3Object(owner.avatar, destKey);
          if (!logoKey) {
            throw new ValidationError('Failed to snapshot business logo; please retry');
          }
          copiedLogoKey = logoKey === owner.avatar ? null : logoKey; // only clean up real copies
        }
        eventData.branding = { logoKey, businessName: owner.name || null };
      } else {
        eventData.invitationDeliveryMode = 'quick_reply';
      }

      // Create event
      let event;
      try {
        event = await Event.create(eventData);
      } catch (createErr) {
        // Roll back the copied logo object so we don't orphan it.
        if (copiedLogoKey) await deleteFromS3(copiedLogoKey).catch(() => {});
        throw createErr;
      }

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
        .populate("guestList", "name phone category status");

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
      // A duplicate-key on the per-event guard means a concurrent request won
      // the single-active-event slot first (the TOCTOU race the partial unique
      // index is there to close). Translate it to the same typed conflict the
      // countDocuments pre-check would have thrown.
      if (err && err.code === 11000 && /perEventGuardKey/.test(err.message || "")) {
        throw new PackageLimitError(
          "events",
          1,
          "You already have an active event on this plan. Cancel or delete it before creating a new one."
        );
      }
      // Consumption happens at SEND time (per-guest), never at create time, so
      // there is no pool debit to roll back here — just surface the error.
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

    const prevStatus = event.status;
    event.status = status;
    if (status === EVENT_STATUS.CANCELLED) {
      event.cancelledAt = new Date();
    }
    await event.save();

    // Free the event slot when cancelling a still-active event (mirrors delete)
    // so "events X/Y" reflects the cancellation. A per-event plan that already
    // sent stays permanently used — _freeEventSlot keeps its slot occupied.
    if (
      status === EVENT_STATUS.CANCELLED &&
      ![EVENT_STATUS.DELETED, EVENT_STATUS.CANCELLED].includes(prevStatus)
    ) {
      await this._freeEventSlot(event.subscriptionId);
    }

    // NOTE: cancellation does NOT release invites. `invitesConsumed` now
    // reflects actually-sent messages (charged at send time), which are
    // non-refundable. Per-event re-creation after cancel/delete is handled by
    // the event-creation gate, not by releasing the pool here.

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
   * Free one "event slot" on a subscription when an event is removed
   * (soft-deleted or cancelled). `usage.eventsCreated` is a display counter
   * (the real create-gate keys off invitesConsumed + active-event count), so it
   * must drop when an event goes away or the host's "events X/Y" never frees.
   *
   * Exception: a per-event plan that has ALREADY SENT (invitesConsumed > 0) is
   * permanently used — keep the slot occupied so it can't be reused. Floored at
   * 0 and idempotent (callers only invoke it on a still-active event).
   * @private
   */
  async _freeEventSlot(subscriptionId) {
    if (!subscriptionId) return;
    try {
      const sub = await Subscription.findById(subscriptionId)
        .populate('planId', 'planType')
        .lean();
      if (!sub) return;
      // A per-event plan is permanently used once SENDING has started — gate on
      // `firstSendAt` (the authoritative signal the rest of the codebase uses),
      // NOT invitesConsumed: a partial-refund clawback bumps invitesConsumed
      // without any send, and must not lock an unsent plan's slot.
      if (isPerEventPlan(sub.planId?.planType) && sub.firstSendAt) {
        return; // per-event plan already used by a send — slot stays occupied
      }
      await Subscription.updateOne(
        { _id: subscriptionId, 'usage.eventsCreated': { $gt: 0 } },
        { $inc: { 'usage.eventsCreated': -1 } }
      );
    } catch (e) {
      logger.warn('[events] failed to free event slot', { subscriptionId: String(subscriptionId), err: e?.message });
    }
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

    // Soft delete: mark the event `deleted` rather than removing the document.
    // Guests are intentionally left in place — they're filtered out by the
    // event's `deleted` status, and keeping them preserves QR codes / RSVP /
    // check-in history. Invites are never released (consumption = sent
    // messages, which are non-refundable). Wrapped in a transaction to keep
    // the structure consistent with the rest of the module.
    const session = await require('mongoose').startSession();
    try {
      await session.withTransaction(async () => {
        await Event.findByIdAndUpdate(
          eventId,
          { status: EVENT_STATUS.DELETED, deletedAt: new Date(), perEventGuardKey: null },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    // Free the event slot ("events X/Y") — only when this was still an active
    // event, so a re-delete of an already-tombstoned event can't double-count.
    if (![EVENT_STATUS.DELETED, EVENT_STATUS.CANCELLED].includes(event.status)) {
      await this._freeEventSlot(event.subscriptionId);
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
    const uniqueIds = Array.from(new Set((eventIds || []).map(String)));
    const succeeded = [];
    const failed = [];

    for (const id of uniqueIds) {
      try {
        await this.deleteEvent(id, userId, false);
        succeeded.push(id.toString());
      } catch (err) {
        failed.push({
          id: id.toString(),
          error: err.message || 'Failed to delete event',
        });
      }
    }

    logAudit({
      action: 'event.bulk_deleted',
      actor: { _id: userId },
      targetType: 'event',
      metadata: {
        deletedCount: succeeded.length,
        eventIds: succeeded,
        failedCount: failed.length,
      },
    }).catch(() => {});

    return {
      success: true,
      count: succeeded.length,
      deletedCount: succeeded.length,
      succeeded,
      failed,
      message: `${succeeded.length} event(s) deleted successfully`,
    };
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
      // Rendered invitation card image (baked template OR custom upload).
      // Without this the mobile EventListItem had no `image` URL and fell
      // back to its placeholder.
      image:
        event.visualTemplate?.bakedImagePath || event.templateImage || null,
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
        bulkSendCompletedAt: event.messagingStatus.bulkSendCompletedAt || null,
      } : null,
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

};

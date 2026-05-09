/**
 * Events Service — Settings sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.settings.service
 */

const { EVENT_STATUS } = require("../../shared/constants");
const {
  NotFoundError,
  ValidationError,
  AppError,
} = require("../../shared/errors");
// Every export/notification helper uses formatRiyadh so we don't
// re-render UTC server-locale dates as the previous local day.
const { parseEventTime } = require("../../shared/utils/timezone");

// Import existing models during migration
const Event = require("../../../models/EventModel");

// File upload helper
const { getFileUrl } = require('../../shared/utils/fileUpload');
// Server-side validator for the host's per-template field values.
// Lazily-required at the call site to keep boot-time cycles minimal.
const Template = require('../../../models/TemplateModel');
const { validateTemplateData } = require('./templateDataValidator');
// Post-review polish — extracted error codes shared between
// updateGuestList and updateEventStep2 so they can't drift.
const { EVENT_EDIT_LOCKED } = require('../../shared/constants/events');

const { logAudit } = require('../../shared/utils/auditLog');

module.exports = {
  /**
   * Validate the host-supplied template field values against the picked
   * Template's `fields[]` definitions.
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
  },

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

    // Extended status block list
    if (
      [EVENT_STATUS.LIVE, EVENT_STATUS.PUBLISHED, EVENT_STATUS.COMPLETED,
       EVENT_STATUS.CANCELLED, EVENT_STATUS.ARCHIVED].includes(event.status)
    ) {
      throw new ValidationError(`Cannot update event when status is '${event.status}'`);
    }

    // Update allowed fields (canonical shape only)
    const allowedFields = [
      "eventDetails",
      "visualTemplate",
      "taqnyatTemplate",
      "guestReplies",
      "templateImage",
      "launchSettings",
      "staffList",
    ];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (field === "templateImage" || typeof updateData[field] !== "object") {
          event[field] = updateData[field];
        } else {
          event[field] = { ...event[field], ...updateData[field] };
        }
      }
    });

    await event.save();

    // Audit event update
    logAudit({
      action: 'event.updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: event._id,
      metadata: { updatedFields: Object.keys(updateData) },
    }).catch(() => {});

    return { event };
  },

  /**
   * Update event details.
   *
   * Accepts the full user context so the unified update wizard works for
   * admin / whitelabel-admin / whitelabel-moderator, not only the host.
   * Scope resolution mirrors `getEventById` via `_buildScopedEventQuery`.
   *
   * @param {string} eventId
   * @param {Object} details
   * @param {Object} userContext - req.user
   * @returns {Promise<Object>}
   */
  async updateEventDetails(eventId, details, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError("Event");

    // Live/published events are immutable
    const BLOCKED_STATUSES = ['live', 'published', 'completed', 'cancelled', 'archived'];
    if (BLOCKED_STATUSES.includes(event.status)) {
      throw new ValidationError(`Cannot modify event details when status is '${event.status}'`);
    }

    // 24h pre-launch edit lock
    this._checkEditLock(event, details);

    event.eventDetails = { ...event.eventDetails, ...details };
    await event.save();

    // Audit event details update
    logAudit({
      action: 'event.details_updated',
      actor: userContext,
      targetType: 'event',
      targetId: event._id,
      metadata: { updatedFields: Object.keys(details) },
    }).catch(() => {});

    return { event };
  },

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
      if (templateImagePath) {
        settings.templateImage = templateImagePath;
        // Mirror onto the canonical visualTemplate.bakedImagePath so
        // messaging readers find it in a single place.
        settings.visualTemplate = {
          ...(settings.visualTemplate || {}),
          bakedImagePath: templateImagePath,
        };
      }
    }

    // Canonical-only writes. The legacy `invitationSettings.*`
    // dual-write was removed when the wizard moved to the canonical
    // shape; clients now send `visualTemplate / taqnyatTemplate /
    // guestReplies / templateImage` directly.
    if (settings.visualTemplate !== undefined) {
      const next = {
        ...(event.visualTemplate?.toObject?.() || event.visualTemplate || {}),
        ...settings.visualTemplate,
      };
      // Validate fieldValues against Template.fields[] BEFORE save.
      if (next.templateRef && next.fieldValues) {
        await this._validateVisualTemplateFieldValues(
          next.templateRef,
          next.fieldValues
        );
      }
      event.visualTemplate = next;
    }
    if (settings.taqnyatTemplate !== undefined) {
      event.taqnyatTemplate = {
        ...(event.taqnyatTemplate?.toObject?.() || event.taqnyatTemplate || {}),
        ...settings.taqnyatTemplate,
      };
    }
    if (settings.guestReplies !== undefined) {
      event.guestReplies = {
        ...(event.guestReplies?.toObject?.() || event.guestReplies || {}),
        ...settings.guestReplies,
      };
    }
    if (settings.templateImage !== undefined) {
      event.templateImage = settings.templateImage;
    }

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
  },

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
  },

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
        channel: result.channel || messageData.channel || 'sms',
        templateName: result.templateName || null,
        imageUrl: result.imageUrl || null,
        success: !!result.success,
        messageId: result.messageId || null,
        ...(result.error && { error: result.error }),
        ...(result.code && { code: result.code }),
      },
      status: result.success ? 'success' : 'failure',
    }).catch(() => {});

    return result;
  },

  /**
   * 24h pre-launch edit lock.
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
  },
};

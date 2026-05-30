/**
 * Events Service — Launch sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.launch.service
 */

const config = require("../../config");
const { ROLES } = require("../../shared/constants/roles");
const {
  NotFoundError,
  ForbiddenError,
} = require("../../shared/errors");

// Import existing models during migration
const Event = require("../../../models/EventModel");

// Import existing services
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');

module.exports = {
  /**
   * Manual launch retry.
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
  },

  /**
   * Notify about event status change
   * @private
   */
  async _notifyEventStatusChange(event, newStatus, actorId, isAdmin) {
    const eventTitle = event.eventDetails?.title || 'Untitled';
    const hostId = event.host;

    // Dedicated notification types for terminal transitions so the
    // host's `eventUpdates` preference can be honored cleanly. Generic
    // status changes still fall through to `event_status_change`.
    let type = 'event_status_change';
    let title = 'Event Status Updated';
    let titleAr = 'تم تحديث حالة المناسبة';
    let message = `Your event "${eventTitle}" status changed to ${newStatus}.`;
    let messageAr = `تم تغيير حالة مناسبتك "${eventTitle}" إلى ${newStatus}.`;
    if (newStatus === 'cancelled') {
      type = 'event_cancelled';
      title = 'Event Cancelled';
      titleAr = 'تم إلغاء المناسبة';
      message = `Your event "${eventTitle}" has been cancelled.`;
      messageAr = `تم إلغاء مناسبتك "${eventTitle}".`;
    } else if (newStatus === 'completed') {
      type = 'event_completed';
      title = 'Event Completed';
      titleAr = 'اكتملت المناسبة';
      message = `Your event "${eventTitle}" is now marked as completed.`;
      messageAr = `تم تحديث حالة مناسبتك "${eventTitle}" إلى مكتملة.`;
    }

    await notificationService.sendToUser(hostId, {
      type,
      title,
      titleAr,
      message,
      messageAr,
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
  },

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
  },
};

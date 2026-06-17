/**
 * Messaging schedule service.
 * Stages an event for cron-driven dispatch at a future wall-clock instant.
 */

const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const config = require('../../config');
const { parseEventTime } = require('../../shared/utils/timezone');
const { logAudit } = require('../../shared/utils/auditLog');
const { AppError, NotFoundError, ForbiddenError } = require('../../shared/errors');
const {
  SCHEDULE_TOO_SOON,
  SCHEDULE_INVALID,
} = require('../../shared/constants/events');

/**
 * Schedule an event launch.
 *
 * Sets `launchSettings` so the cron picks it up. The whole flow goes
 * through `scheduleEventLaunch` regardless of channel — single retry
 * path, idempotency contract, and lock semantics.
 *
 * Backend lower bound: reject any schedule whose absolute UTC instant
 * is < `now + scheduleMinLeadHours` away (default 48h). The picker
 * enforces the same floor; the backend check exists so a crafted POST
 * cannot bypass it.
 */
async function scheduleBulkSend({
  eventId,
  scheduledDate,
  scheduledTime,
  userId,
}) {
  const event = await Event.findById(eventId)
    .populate('host', 'name username')
    .populate('planId', 'code planType');
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (event.host && userId && event.host._id.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  const guests = await Guest.find({
    event: eventId,
    phone: { $exists: true, $ne: null },
  });
  if (guests.length === 0) {
    throw new AppError(
      'No guests with phone numbers to send to',
      400,
      'NO_GUESTS'
    );
  }

  const isTrial = event.planId?.code === 'trial' || event.planId?.planType === 'trial';
  const minLeadMs = isTrial
    ? (config?.events?.trialScheduleMinLeadMinutes ?? 15) * 60 * 1000
    : (config?.events?.scheduleMinLeadHours ?? 48) * 60 * 60 * 1000;

  const minLeadHours = isTrial
    ? Math.ceil((config?.events?.trialScheduleMinLeadMinutes ?? 15) / 60)
    : (config?.events?.scheduleMinLeadHours ?? 48);

  // Reuse parseEventTime so the wall-clock interpretation matches the
  // cron's `isDue` check (Asia/Riyadh, UTC+3, no DST).
  const scheduledInstant = parseEventTime(
    {
      launchSettings: {
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
      },
    },
    'Asia/Riyadh'
  );
  if (!scheduledInstant) {
    throw new AppError(
      'Invalid scheduledDate or scheduledTime format',
      400,
      SCHEDULE_INVALID
    );
  }
  const leadMs = scheduledInstant.getTime() - Date.now();
  if (leadMs < minLeadMs) {
    const unit = isTrial ? 'minutes' : 'hours';
    throw new AppError(
      `Schedule must be at least ${minLeadHours} ${unit} from now.`,
      400,
      SCHEDULE_TOO_SOON
    );
  }

  await Event.findByIdAndUpdate(eventId, {
    status: 'scheduled',
    'launchSettings.scheduledDate': new Date(scheduledDate),
    'launchSettings.scheduledTime': scheduledTime,
    'messagingStatus.preferredChannel': 'whatsapp',
    'messagingStatus.totalMessages': guests.length,
    'messagingStatus.pendingCount': guests.length,
    attemptCount: 0,
    failureReason: null,
  });

  try {
    await logAudit({
      action: 'messaging.schedule',
      actor: { _id: userId || null, role: userId ? 'host' : 'system' },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        channel: 'whatsapp',
        scheduledDate,
        scheduledTime,
        guestCount: guests.length,
      },
    });
  } catch (_) {
    /* audit must never break the operation */
  }

  return {
    success: true,
    scheduledDate,
    scheduledTime,
    channel: 'whatsapp',
    guestCount: guests.length,
  };
}

module.exports = {
  scheduleBulkSend,
};

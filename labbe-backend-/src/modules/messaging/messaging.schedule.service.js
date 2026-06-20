/**
 * Messaging schedule service.
 * Stages an event for cron-driven dispatch at a future wall-clock instant.
 */

const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const { toRiyadhComponents } = require('../../shared/utils/timezone');
const {
  isTrialFromPlan,
  eventInstantOf,
  parseSendInstant,
  assertSendWindow,
  TRIAL_REMINDER_OFFSET_MS,
} = require('../../shared/utils/schedulingWindow');
const { logAudit } = require('../../shared/utils/auditLog');
const { AppError, NotFoundError, ForbiddenError } = require('../../shared/errors');

/**
 * Schedule an event launch.
 *
 * Sets `launchSettings` so the cron picks it up. The whole flow goes
 * through `scheduleEventLaunch` regardless of channel — single retry
 * path, idempotency contract, and lock semantics.
 *
 * Scheduling window: the absolute UTC send instant must fall within
 * `[ now + minLead(plan), eventInstant − 3 days ]`. minLead is 15min
 * (trial) / 24h (paid). Below min → SCHEDULE_TOO_SOON, above max (too
 * close to the event) → SCHEDULE_TOO_LATE. The picker enforces the same
 * bounds; the backend check exists so a crafted POST cannot bypass it.
 *
 * After validating, a TRIAL event's normal reminder is pinned to
 * `scheduledSend + 10min` (paid keeps the pre-save default event−48h).
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

  const isTrial = isTrialFromPlan(event.planId);

  // The send instant — same Asia/Riyadh wall-clock → UTC interpretation
  // as the cron's `isDue` check. Throws SCHEDULE_INVALID if unparseable.
  const scheduledInstant = parseSendInstant(new Date(scheduledDate), scheduledTime);

  // The event's real UTC instant (date + time), used for the upper bound.
  const eventInstant = eventInstantOf(event);

  // Window: [ now + minLead(plan), eventInstant − 3 days ].
  //   below min → SCHEDULE_TOO_SOON,  above max → SCHEDULE_TOO_LATE.
  assertSendWindow({ scheduledInstant, eventInstant, isTrial });

  const update = {
    status: 'scheduled',
    'launchSettings.scheduledDate': new Date(scheduledDate),
    'launchSettings.scheduledTime': scheduledTime,
    'messagingStatus.preferredChannel': 'whatsapp',
    'messagingStatus.totalMessages': guests.length,
    'messagingStatus.pendingCount': guests.length,
    attemptCount: 0,
    failureReason: null,
  };

  // Normal/auto reminder. TRIAL: pin it to scheduledSend + 10 minutes and
  // mark it custom so the EventModel pre-save (which recomputes
  // event−48h when customReminderTime===false) can't clobber it. This
  // update goes through findByIdAndUpdate (no pre-save hook), but a later
  // `.save()` elsewhere would, hence customReminderTime:true is required.
  // PAID: leave the reminder untouched — the pre-save default (event−48h)
  // applies unless the host customized it.
  if (isTrial) {
    const reminderInstant = new Date(scheduledInstant.getTime() + TRIAL_REMINDER_OFFSET_MS);
    const comps = toRiyadhComponents(reminderInstant);
    update['reminderSettings.scheduledDate'] = comps.date;
    update['reminderSettings.scheduledTime'] = comps.time;
    update['reminderSettings.customReminderTime'] = true;
  }

  await Event.findByIdAndUpdate(eventId, update);

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

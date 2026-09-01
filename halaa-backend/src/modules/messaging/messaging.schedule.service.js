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
const { EVENT_LIFECYCLE_ALLOWED } = require('../../shared/constants');
const {
  resolveTaqnyatTemplate,
  computeInvitationFingerprint,
} = require('./messaging.formatting');
const { getActiveEventGuestsFilter } = require('../../shared/utils/guestFilter');

/**
 * Schedule an event launch.
 *
 * Sets `launchSettings` so the cron picks it up. The whole flow goes
 * through `scheduleEventLaunch` regardless of channel — single retry
 * path, idempotency contract, and lock semantics.
 */
async function scheduleBulkSend({
  eventId,
  scheduledDate,
  scheduledTime,
  userId,
  isAdmin = false,
  actorRole,
}) {
  const event = await Event.findById(eventId)
    .populate('host', 'name username')
    .populate('planId', 'code planType');
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (!isAdmin && event.host && userId && event.host._id.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this event');
  }

  // Lifecycle check: allow only pending_scheduling or scheduled
  if (!EVENT_LIFECYCLE_ALLOWED.SCHEDULE.includes(event.status)) {
    throw new AppError(
      `Cannot schedule event with status "${event.status}". Only pending or scheduled events can be scheduled.`,
      409,
      'EVENT_LIFECYCLE_CONFLICT'
    );
  }

  // Canonical fingerprint validation: test message must match current content
  const cachedTemplate = await resolveTaqnyatTemplate(event);
  const currentFingerprint = computeInvitationFingerprint(event, cachedTemplate);

  if (!event.testMessageSent || event.testMessageFingerprint !== currentFingerprint) {
    throw new AppError(
      'A test message matching the current invitation content must be sent before scheduling',
      409,
      'TEST_MESSAGE_REQUIRED'
    );
  }

  const guests = await Guest.find({
    ...getActiveEventGuestsFilter(eventId, event.guestList),
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

  // Normal/auto reminder. TRIAL: pin it to scheduledSend + 10 minutes
  if (isTrial) {
    const reminderInstant = new Date(scheduledInstant.getTime() + TRIAL_REMINDER_OFFSET_MS);
    const comps = toRiyadhComponents(reminderInstant);
    update['reminderSettings.scheduledDate'] = comps.date;
    update['reminderSettings.scheduledTime'] = comps.time;
    update['reminderSettings.customReminderTime'] = true;
  }

  const scheduled = await Event.updateOne(
    {
      _id: eventId,
      status: { $in: EVENT_LIFECYCLE_ALLOWED.SCHEDULE },
      testMessageSent: true,
      testMessageFingerprint: currentFingerprint,
    },
    { $set: update }
  );
  if (scheduled.matchedCount !== 1) {
    throw new AppError(
      'Event content or lifecycle changed while scheduling; send a new test message and try again',
      409,
      'TEST_MESSAGE_REQUIRED'
    );
  }

  try {
    await logAudit({
      action: 'messaging.schedule',
      actor: { _id: userId || null, role: actorRole || (userId ? 'host' : 'system') },
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

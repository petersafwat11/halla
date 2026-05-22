/**
 * Scheduled extra reminder service.
 *
 * Owns the create / list / cancel operations driving the user-facing
 * "Schedule extra reminder" feature. The dispatcher cron lives in
 * `shared/utils/scheduledTasks.js` and is the only other consumer of the
 * ScheduledExtraReminder model. Quota accounting is split between this
 * service (reserve on create, release on cancel) and the cron (consume on
 * successful send, release on failure / rate-limit).
 *
 * @module modules/scheduled-extra-reminders/scheduled-extra-reminders.service
 */

const mongoose = require('mongoose');

const ScheduledExtraReminder = require('../../../models/ScheduledExtraReminderModel');
const Subscription = require('../../../models/SubscriptionModel');
const Guest = require('../../../models/GuestModel');
const eventsService = require('../events/events.service');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const {
  AppError,
  NotFoundError,
  ValidationError,
} = require('../../shared/errors');

const FIVE_MIN_MS = 5 * 60 * 1000;
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

const safeAudit = async (entry) => {
  try {
    await logAudit(entry);
  } catch (err) {
    logger.warn?.('scheduled-extra-reminder audit log failed', {
      action: entry?.action,
      err: err?.message,
    });
  }
};

async function _resolveScopedEvent(eventId, user) {
  const { event } = await eventsService.getEventById(eventId, user);
  if (!event) throw new NotFoundError('Event');
  return event;
}

async function list({ eventId, user }) {
  await _resolveScopedEvent(eventId, user); // 404/403 on no access
  const reminders = await ScheduledExtraReminder.find({ event: eventId })
    .sort({ scheduledFor: 1, createdAt: -1 })
    .lean();
  return reminders;
}

async function create({ eventId, body, user }) {
  const event = await _resolveScopedEvent(eventId, user);

  if (!event.subscriptionId) {
    throw new AppError(
      'Event has no subscription — cannot schedule reminders',
      400,
      'EVENT_HAS_NO_SUBSCRIPTION'
    );
  }

  const now = Date.now();
  const target = new Date(body.scheduledFor).getTime();
  const eventTs = new Date(event.eventDetails?.date).getTime();
  const inviteSentTs = new Date(
    event.launchSettings?.scheduledDate ||
      event.launchedAt ||
      event.createdAt ||
      now
  ).getTime();

  if (!Number.isFinite(eventTs)) {
    throw new ValidationError('Event date is missing or invalid');
  }
  if (target < now + FIVE_MIN_MS) {
    throw new AppError(
      'Reminder must be at least 5 minutes in the future',
      400,
      'REMINDER_TOO_SOON'
    );
  }
  if (target > eventTs - TWENTY_FOUR_H_MS) {
    throw new AppError(
      'Reminder must be at least 24 hours before the event',
      400,
      'REMINDER_TOO_LATE'
    );
  }
  if (target < inviteSentTs) {
    throw new AppError(
      'Reminder must be after the initial invite',
      400,
      'REMINDER_BEFORE_INVITE'
    );
  }

  // Validate every guestId actually belongs to this event — defence against
  // a hostile UI submitting another event's guest IDs.
  const validCount = await Guest.countDocuments({
    _id: { $in: body.guestIds },
    event: eventId,
  });
  if (validCount !== body.guestIds.length) {
    throw new ValidationError('Some guests do not belong to this event');
  }

  // Reserve atomically before creating the doc so a race-induced
  // over-allocation surfaces as a 400 here rather than as an orphan row.
  try {
    await Subscription.reserveReminders(event.subscriptionId, body.guestIds.length);
  } catch (err) {
    if (err?.code === 'INSUFFICIENT_REMINDER_QUOTA') {
      throw new AppError(
        'Insufficient reminder quota — buy more extras to schedule',
        400,
        'INSUFFICIENT_REMINDER_QUOTA'
      );
    }
    throw err;
  }

  let doc;
  try {
    doc = await ScheduledExtraReminder.create({
      event: eventId,
      subscriptionId: event.subscriptionId,
      eventOwner: event.host?._id || event.host,
      createdBy: {
        user: user._id,
        role: user.role,
        onBehalfOfOwner:
          String(user._id) !==
          String(event.host?._id || event.host),
      },
      reminderType: body.reminderType,
      guestIds: body.guestIds,
      scheduledFor: new Date(body.scheduledFor),
      status: 'pending',
      consumedQuota: body.guestIds.length,
    });
  } catch (err) {
    // Refund the reservation if create failed (e.g. validation, DB hiccup).
    await Subscription.releaseReservedReminders(
      event.subscriptionId,
      body.guestIds.length
    ).catch(() => {});
    throw err;
  }

  await Guest.updateMany(
    { _id: { $in: body.guestIds } },
    {
      $set: {
        'invitation.extraReminderScheduled': true,
        'invitation.extraReminderScheduledFor': doc.scheduledFor,
        'invitation.extraReminderType': body.reminderType,
        'invitation.extraReminderDocId': doc._id,
      },
    }
  );

  await safeAudit({
    action: 'scheduled_extra_reminder.created',
    actor: user,
    targetType: 'scheduled_extra_reminder',
    targetId: doc._id,
    whitelabelId: event.whitelabelId || null,
    metadata: {
      eventId: String(eventId),
      reminderType: body.reminderType,
      guestCount: body.guestIds.length,
      scheduledFor: doc.scheduledFor,
      onBehalfOfOwner: doc.createdBy.onBehalfOfOwner,
      ownerHostId: String(event.host?._id || event.host),
    },
  });

  return doc;
}

async function cancel({ eventId, reminderId, user }) {
  const event = await _resolveScopedEvent(eventId, user);

  if (!mongoose.isValidObjectId(reminderId)) {
    throw new NotFoundError('ScheduledExtraReminder');
  }

  const doc = await ScheduledExtraReminder.findOne({
    _id: reminderId,
    event: eventId,
  });
  if (!doc) throw new NotFoundError('ScheduledExtraReminder');
  if (doc.status !== 'pending') {
    throw new AppError(
      `Cannot cancel a ${doc.status} reminder`,
      400,
      'INVALID_REMINDER_STATUS'
    );
  }

  // Atomic flip — second concurrent cancel returns null and surfaces 409.
  const flipped = await ScheduledExtraReminder.findOneAndUpdate(
    { _id: doc._id, status: 'pending' },
    { $set: { status: 'cancelled', finishedAt: new Date() } },
    { new: true }
  );
  if (!flipped) {
    throw new AppError(
      'Reminder already processed',
      409,
      'REMINDER_ALREADY_PROCESSED'
    );
  }

  await Subscription.releaseReservedReminders(
    event.subscriptionId,
    doc.consumedQuota
  ).catch(() => {});

  await Guest.updateMany(
    { _id: { $in: doc.guestIds }, 'invitation.extraReminderDocId': doc._id },
    {
      $set: { 'invitation.extraReminderScheduled': false },
      $unset: {
        'invitation.extraReminderScheduledFor': '',
        'invitation.extraReminderType': '',
        'invitation.extraReminderDocId': '',
      },
    }
  );

  await safeAudit({
    action: 'scheduled_extra_reminder.cancelled',
    actor: user,
    targetType: 'scheduled_extra_reminder',
    targetId: doc._id,
    whitelabelId: event.whitelabelId || null,
    metadata: { refundedQuota: doc.consumedQuota, eventId: String(eventId) },
  });

  return { cancelled: true, refundedQuota: doc.consumedQuota };
}

module.exports = { list, create, cancel };

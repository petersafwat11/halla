/**
 * Admin Events Service
 * Event management operations for the admin module.
 */

const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const StaffAccessToken = require('../../../models/StaffAccessTokenModel');
const Subscription = require('../../../models/SubscriptionModel');
const User = require('../../../models/UserModel');
const { NotFoundError, ValidationError, AppError } = require('../../shared/errors');
const { ROLES, USER_STATUS, EVENT_STATUS, INVITATION_TYPE, EVENT_LIFECYCLE_ALLOWED, isValidEventStatusTransition } = require('../../shared/constants');
const mongoose = require('mongoose');
const notificationService = require('../notifications/notifications.service');
const logger = require('../../shared/utils/logger');
const { guardExportMaxRows } = require('../../shared/utils/excelExport');
const { buildDateRangeQuery, formatTargetSubscription } = require('./admin.shared.service');
const {
  isTrialFromPlan,
  eventInstantOf,
  assertEventDateFloor,
  isSendInWindow,
  storedSendInstant,
} = require('../../shared/utils/schedulingWindow');
const taqnyatTemplatesService = require('../taqnyat-templates/taqnyat-templates.service');
const { getFileUrl } = require('../../shared/utils/fileUpload');

/**
 * Get event by ID (admin)
 */
async function getEventById(eventId) {
  const query = { _id: eventId };

  const event = await Event.findOne(query)
    .populate('host', 'email phoneNumber name')
    .populate('guestList', 'name phone category status rsvp checkIn')
    .lean();

  if (!event) {
    throw new NotFoundError('Event');
  }

  return { event };
}

/**
 * Full event update (admin)
 */
async function updateEventFull(eventId, updateData, context = {}) {
  const query = { _id: eventId };

  // Populate planId so trial-vs-paid scheduling windows resolve correctly.
  const event = await Event.findOne(query).populate('planId', 'code planType');
  if (!event) {
    throw new NotFoundError('Event');
  }
  if (updateData.guestList !== undefined || updateData.staffList !== undefined) {
    throw new ValidationError(
      'Direct updates to guestList or staffList via full-event update are deprecated. Use dedicated guest and staff endpoints.'
    );
  }

  const messageAffectingFields = [
    'eventDetails',
    'visualTemplate',
    'taqnyatTemplate',
    'templateImage',
    'invitationType',
    'guestReplies',
  ];
  const touchesMessage = messageAffectingFields.some((field) => updateData[field] !== undefined)
    || Boolean(context.file);
  if (touchesMessage && !EVENT_LIFECYCLE_ALLOWED.DETAILS_MUTATION.includes(event.status)) {
    throw new AppError(
      `Cannot modify message-affecting event fields when status is '${event.status}'`,
      409,
      'EVENT_LIFECYCLE_CONFLICT'
    );
  }
  const wasScheduled = event.status === EVENT_STATUS.SCHEDULED;

  const allowedFields = [
    'eventDetails',
    'visualTemplate',
    'taqnyatTemplate',
    'guestReplies',
    'invitationType',
    'templateImage',
  ];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (
        field === 'visualTemplate' ||
        field === 'taqnyatTemplate' ||
        field === 'guestReplies'
      ) {
        // Sub-doc merge so partial updates don't blow away unrelated keys.
        event[field] = {
          ...((event[field]?.toObject?.() || event[field]) || {}),
          ...updateData[field],
        };
      } else {
        event[field] = updateData[field];
      }
    }
  });

  // Event-date floor + stored-schedule re-validation — the admin path must
  // NOT bypass the date gate that host edits enforce. `eventDetails` was
  // assigned wholesale above, so the new date/time is already on the doc.
  // Gate on date/time actually changing so a cosmetic admin edit on a
  // near-term event isn't rejected.
  const newDetails = updateData.eventDetails || {};
  const dateTimeChanging = newDetails.date !== undefined || newDetails.time !== undefined;
  if (dateTimeChanging) {
    const isTrial = isTrialFromPlan(event.planId);
    const newEventInstant = eventInstantOf(event);

    // Floor: a valid send window must still exist for the new event date.
    assertEventDateFloor({ eventInstant: newEventInstant, isTrial });

    // Re-validate against the new event date only on the upper bound + "still
    // in the future"; do not re-impose the original min-lead (requireMinLead:
    // false), so a valid schedule isn't cleared just because time passed.
    const sendInstant = storedSendInstant(event);
    if (sendInstant && !isSendInWindow({ scheduledInstant: sendInstant, eventInstant: newEventInstant, isTrial, requireMinLead: false })) {
      event.launchSettings = { ...event.launchSettings, scheduledDate: undefined, scheduledTime: undefined };
      if (event.status === EVENT_STATUS.SCHEDULED) {
        event.status = EVENT_STATUS.PENDING_SCHEDULING;
      }
    }

    // Reminder reset — mirror updateEventDetails. If a custom reminder now
    // sits at/after the new (earlier) event time, drop customReminderTime so
    // the pre-save recomputes the default; otherwise a reminder would fire
    // after the event (the pre-save skips while customReminderTime===true).
    if (event.reminderSettings?.customReminderTime) {
      const { parseReminderTime, parseDateTime } = require('../../shared/utils/timezone');
      const reminderTime = parseReminderTime(event);
      const newEventTimeUtc = parseDateTime(event.eventDetails.date, event.eventDetails.time);
      if (reminderTime && newEventTimeUtc && reminderTime.getTime() >= newEventTimeUtc.getTime()) {
        event.reminderSettings.customReminderTime = false;
      }
    }
  }

  await taqnyatTemplatesService.assertInviteTemplateCompatible(
    event.taqnyatTemplate?.templateRef,
    {
      category: event.eventDetails?.type,
      invitationMode: event.invitationType || INVITATION_TYPE.REPLY_AND_QR,
    }
  );

  if (context.file) {
    const templateImagePath = getFileUrl(context.file);
    event.templateImage = templateImagePath;
    event.visualTemplate = {
      ...((event.visualTemplate?.toObject?.() || event.visualTemplate) || {}),
      bakedImagePath: templateImagePath,
    };
  }

  // Message-affecting updates invalidate test message fingerprint and auto-unschedule
  if (touchesMessage) {
    const unscheduled = await Event.updateOne(
      { _id: event._id, status: 'scheduled' },
      {
        $set: {
          status: 'pending_scheduling',
          testMessageSent: false,
          testMessageFingerprint: null,
        },
        $unset: {
          'launchSettings.scheduledDate': 1,
          'launchSettings.scheduledTime': 1,
        },
      }
    );
    if (wasScheduled && unscheduled.modifiedCount !== 1) {
      throw new AppError(
        'Event lifecycle changed while the admin update was being applied',
        409,
        'EVENT_LIFECYCLE_CONFLICT'
      );
    }
    if (unscheduled.modifiedCount > 0) {
      event.status = 'pending_scheduling';
      event.testMessageSent = false;
      event.testMessageFingerprint = null;
      if (event.launchSettings) {
        event.launchSettings.scheduledDate = undefined;
        event.launchSettings.scheduledTime = undefined;
      }
    } else {
      event.testMessageSent = false;
      event.testMessageFingerprint = null;
    }
  }

  await event.save();

  // Notify host of event update by admin (non-blocking)
  if (event.host) {
    const eventTitle = event.eventDetails?.title || 'Untitled';
    notificationService.sendToUser(event.host, {
      type: 'event_updated',
      title: 'Event Updated by Admin',
      titleAr: 'تم تحديث المناسبة من قبل المسؤول',
      message: `Your event "${eventTitle}" has been updated by an admin.`,
      messageAr: `تم تحديث مناسبتك "${eventTitle}" من قبل المسؤول.`,
      data: { entityType: 'event', entityId: event._id },
    }).catch((err) => logger.error('admin.service notify failed', err));
  }

  return { event };
}

/**
 * Get event targets (hosts with subscription info)
 */
async function getEventTargets(type = 'host', requestingUser = null) {
  const query = { role: ROLES.HOST, status: { $ne: USER_STATUS.DELETED } };

  const users = await User.find(query)
    .select('name email phoneNumber role status')
    .lean();

  const userIds = users.map(u => u._id);
  const subscriptions = await Subscription.find({ userId: { $in: userIds } })
    .populate('planId', 'planType code limits features')
    .lean();

  const subMap = {};
  subscriptions.forEach(s => { subMap[s.userId.toString()] = s; });

  const targets = users.map(u => {
    const sub = subMap[u._id.toString()];

    return {
      ...u,
      id: u._id,
      subscription: sub ? formatTargetSubscription(sub) : null,
    };
  });

  return { targets };
}

/**
 * Create event for host (admin action) - rewritten to use eventsService pattern
 */
async function createEventForHost(eventData, guestList, context) {
  const subscriptionOwnerId = context.userId;

  const activeSubs = await Subscription.findActiveForUser(subscriptionOwnerId);
  const subscription = activeSubs[0] || null;
  const eventsService = require('../events/events.service');
  return eventsService.createEvent(eventData, guestList, { ...context, subscription });
}

/**
 * Update event status (admin action)
 */
async function updateEventStatus(eventId, status, context = {}) {
  const query = { _id: eventId };

  const event = await Event.findOne(query);
  if (!event) {
    throw new NotFoundError('Event');
  }

  if (!isValidEventStatusTransition(event.status, status)) {
    throw new ValidationError(`Cannot transition event from '${event.status}' to '${status}'`);
  }

  if (event.status === status) {
    return event;
  }

  const prevStatus = event.status;
  event.status = status;

  if (status === EVENT_STATUS.CANCELLED) {
    event.previousStatus = prevStatus;
    event.cancelledAt = new Date();
    // Free the event slot when cancelling a still-active event
    if (![EVENT_STATUS.DELETED, EVENT_STATUS.CANCELLED].includes(prevStatus)) {
      await require('../events/events.service')._freeEventSlot(event.subscriptionId);
    }
  } else if (prevStatus === EVENT_STATUS.CANCELLED) {
    event.cancelledAt = null;
    event.previousStatus = null;
  }

  await event.save();

  // Notify host of event status change by admin (non-blocking)
  if (event?.host) {
    const eventTitle = event.eventDetails?.title || 'Untitled';
    notificationService.sendToUser(event.host, {
      type: 'event_status_change',
      title: 'Event Status Updated',
      titleAr: 'تم تحديث حالة المناسبة',
      message: `Your event "${eventTitle}" status has been updated to ${event.status}.`,
      messageAr: `تم تحديث حالة مناسبتك "${eventTitle}" إلى ${event.status}.`,
      data: { entityType: 'event', entityId: event._id, metadata: { newStatus: event.status } },
    }).catch((err) => logger.error('admin.service notify failed', err));
  }

  return event;
}

/**
 * Bulk update event status
 */
async function bulkUpdateEventStatus(eventIds, status, context = {}) {
  if (!Object.values(EVENT_STATUS).includes(status)) {
    throw new ValidationError('Invalid status value');
  }

  const succeeded = [];
  const failed = [];

  for (const id of eventIds) {
    try {
      await updateEventStatus(id, status, context);
      succeeded.push(id.toString());
    } catch (err) {
      failed.push({
        id: id.toString(),
        error: err.message || 'Failed to update status',
      });
    }
  }

  return {
    success: true,
    updatedCount: succeeded.length,
    succeeded,
    failed,
    message: `${succeeded.length} event(s) updated to ${status}`,
  };
}

/**
 * Delete event (admin action)
 */
async function deleteEvent(eventId, context = {}) {
  const query = { _id: eventId };

  const event = await Event.findOne(query);
  if (!event) {
    throw new NotFoundError('Event');
  }

  if (event.status === EVENT_STATUS.DELETED) {
    return { success: true, message: 'Event deleted successfully' };
  }

  const prevStatus = event.status;
  event.status = EVENT_STATUS.DELETED;
  event.deletedAt = new Date();
  event.perEventGuardKey = null;
  await event.save();

  // Free the event slot (mirror the host delete path) when it was still active,
  // so the owner's "events X/Y" reflects an admin-initiated deletion too.
  if (![EVENT_STATUS.DELETED, EVENT_STATUS.CANCELLED].includes(prevStatus)) {
    await require('../events/events.service')._freeEventSlot(event.subscriptionId);
  }

  // Revoke active staff access tokens
  await StaffAccessToken.updateMany(
    { event: eventId, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );

  return { success: true, message: 'Event deleted successfully' };
}

/**
 * Bulk delete events
 */
async function bulkDeleteEvents(eventIds, context = {}) {
  const succeeded = [];
  const failed = [];

  for (const id of eventIds) {
    try {
      await deleteEvent(id, context);
      succeeded.push(id.toString());
    } catch (err) {
      failed.push({
        id: id.toString(),
        error: err.message || 'Failed to delete event',
      });
    }
  }

  return {
    success: true,
    deletedCount: succeeded.length,
    succeeded,
    failed,
    message: `${succeeded.length} event(s) deleted successfully`,
  };
}

/**
 * Export events
 */
async function exportEvents({ search, status, from, to } = {}) {
  const query = { status: { $ne: 'deleted' } };
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query['eventDetails.eventName'] = { $regex: escaped, $options: 'i' };
  }
  if (status) query.status = status;
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

  // enforce export row cap
  const count = await Event.countDocuments(query);
  guardExportMaxRows(count, 'events');

  const events = await Event.find(query)
    .select('eventDetails status guestList host createdAt')
    .populate({ path: 'host', select: 'name' })
    .sort({ createdAt: -1 })
    .lean();

  return events.map(e => ({
    Title: e.eventDetails?.eventName || e.eventDetails?.title || '-',
    Host: e.host?.name || '-',
    Date: e.eventDetails?.date || '-',
    Guests: e.guestList?.length || 0,
    Status: e.status || '-',
    'Created At': e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : '-',
  }));
}

module.exports = {
  getEventById,
  updateEventFull,
  getEventTargets,
  createEventForHost,
  updateEventStatus,
  bulkUpdateEventStatus,
  deleteEvent,
  bulkDeleteEvents,
  exportEvents,
};

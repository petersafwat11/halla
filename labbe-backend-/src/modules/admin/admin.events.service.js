/**
 * Admin Events Service
 * Event management operations for the admin module.
 */

const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const Subscription = require('../../../models/SubscriptionModel');
const User = require('../../../models/UserModel');
const { NotFoundError } = require('../../shared/errors');
const { ROLES, WHITELABEL_ROLES, USER_STATUS, EVENT_STATUS } = require('../../shared/constants');
const mongoose = require('mongoose');
const notificationService = require('../notifications/notifications.service');
const logger = require('../../shared/utils/logger');
const { guardExportMaxRows } = require('../../shared/utils/excelExport');
const {
  resolveTaqnyatTemplateRef,
  resolveVisualTemplateRef,
} = require('../events/templateRefResolver');
const { buildDateRangeQuery, formatTargetSubscription } = require('./admin.shared.service');

/**
 * Get event by ID (admin - with whitelabel filter)
 */
async function getEventById(eventId, whitelabelId = undefined) {
  const query = { _id: eventId };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const event = await Event.findOne(query)
    .populate('host', 'username email phoneNumber name')
    .populate('guestList', 'name email phone status rsvpStatus checkedIn')
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
  if (context.whitelabelId !== undefined) {
    query.whitelabelId = context.whitelabelId;
  }

  const event = await Event.findOne(query);
  if (!event) {
    throw new NotFoundError('Event');
  }

  const allowedFields = [
    'eventDetails',
    'invitationSettings',
    'staffList',
    'visualTemplate',
    'taqnyatTemplate',
    'guestReplies',
  ];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (field === 'invitationSettings' || field === 'visualTemplate' ||
          field === 'taqnyatTemplate' || field === 'guestReplies') {
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

  // Cross-shape sync: if admin sent legacy keys, project them into
  // canonical fields too. If admin sent canonical keys, project them
  // back. Mirrors `events.service.updateInvitationSettings` so the
  // two writers behave identically.
  const inv = event.invitationSettings || {};
  if (updateData.invitationSettings) {
    const legacy = updateData.invitationSettings;
    if (legacy.visualTemplate) {
      const resolvedVisualRef = resolveVisualTemplateRef(
        legacy.visualTemplate.id || event.visualTemplate?.templateRef
      );
      const visualMerged = {
        ...((event.visualTemplate?.toObject?.() || event.visualTemplate) || {}),
        fieldValues: legacy.visualTemplate.data || event.visualTemplate?.fieldValues,
        bakedImagePath:
          legacy.visualTemplate.src ||
          legacy.templateImage ||
          event.visualTemplate?.bakedImagePath,
      };
      if (resolvedVisualRef) visualMerged.templateRef = resolvedVisualRef;
      event.visualTemplate = visualMerged;
    }
    if (legacy.selectedTemplate?.id) {
      const resolvedTaqnyatRef = await resolveTaqnyatTemplateRef(legacy.selectedTemplate.id);
      if (resolvedTaqnyatRef) {
        event.taqnyatTemplate = {
          ...((event.taqnyatTemplate?.toObject?.() || event.taqnyatTemplate) || {}),
          templateRef: resolvedTaqnyatRef,
        };
      }
    }
    const replies = event.guestReplies?.toObject?.() || event.guestReplies || {};
    if (legacy.attendanceAutoReply !== undefined) replies.onAttend = legacy.attendanceAutoReply;
    if (legacy.absenceAutoReply !== undefined) replies.onAbsent = legacy.absenceAutoReply;
    if (legacy.expectedAttendanceAutoReply !== undefined) replies.onExpected = legacy.expectedAttendanceAutoReply;
    event.guestReplies = replies;
  }
  if (updateData.guestReplies) {
    const merged = { ...inv };
    if (updateData.guestReplies.onAttend !== undefined) merged.attendanceAutoReply = updateData.guestReplies.onAttend;
    if (updateData.guestReplies.onAbsent !== undefined) merged.absenceAutoReply = updateData.guestReplies.onAbsent;
    if (updateData.guestReplies.onExpected !== undefined) merged.expectedAttendanceAutoReply = updateData.guestReplies.onExpected;
    event.invitationSettings = merged;
  }

  // Handle guest list update inside a transaction so deleteMany + insertMany are atomic
  if (updateData.guestList) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Guest.deleteMany({ event: eventId }, { session });
        if (updateData.guestList.length > 0) {
          const docs = updateData.guestList.map(g => ({
            name: g.name,
            phone: g.phone,
            email: g.email,
            event: eventId,
            status: 'invited',
            addedBy: context.adminId,
          }));
          const saved = await Guest.insertMany(docs, { session });
          event.guestList = saved.map(g => g._id);
        } else {
          event.guestList = [];
        }
      });
    } finally {
      session.endSession();
    }
  }

  if (context.file) {
    const templateImagePath = `/uploads/templates/${context.file.filename}`;
    event.invitationSettings = event.invitationSettings || {};
    event.invitationSettings.templateImage = templateImagePath;
    event.visualTemplate = {
      ...((event.visualTemplate?.toObject?.() || event.visualTemplate) || {}),
      bakedImagePath: templateImagePath,
    };
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
 * Get event targets (hosts or whitelabel_admins with subscription info)
 * Filters by whitelabelId based on requesting user's role:
 * - Whitelabel admins: only see hosts belonging to their whitelabel
 * - Platform admins: see all hosts except whitelabel-owned ones
 * - Super admin: sees everything
 */
async function getEventTargets(type = 'host', requestingUser = null) {
  const role = type === 'whitelabel' ? ROLES.WHITELABEL_ADMIN : ROLES.HOST;

  const query = { role, status: { $ne: USER_STATUS.DELETED } };

  // Apply whitelabel filtering
  if (requestingUser) {
    const isWhitelabelUser = WHITELABEL_ROLES.includes(requestingUser.role);
    const isSuperAdmin = requestingUser.role === ROLES.SUPER_ADMIN;

    if (isWhitelabelUser && requestingUser.whitelabelId) {
      query.whitelabelId = requestingUser.whitelabelId;
    } else if (!isSuperAdmin) {
      query.whitelabelId = null;
    }
  }

  const users = await User.find(query)
    .select('username name email phoneNumber role status whitelabelId')
    .lean();

  const userIds = users.map(u => u._id);
  const subscriptions = await Subscription.find({ userId: { $in: userIds } })
    .populate('planId', 'planType code limits features')
    .lean();

  const subMap = {};
  subscriptions.forEach(s => { subMap[s.userId.toString()] = s; });

  // When whitelabel admin queries for their hosts, hosts share the whitelabel's plan.
  // Fetch the whitelabel's subscription once and apply it to all their hosts.
  let whitelabelSub = null;
  if (type === 'host' && requestingUser && WHITELABEL_ROLES.includes(requestingUser.role) && requestingUser.whitelabelId) {
    const wlSubs = await Subscription.findActiveForUser(requestingUser.whitelabelId);
    whitelabelSub = wlSubs[0] || null;
  }

  const targets = users.map(u => {
    // For whitelabel admin querying hosts: use whitelabel's subscription
    // For all other cases: use the user's own subscription
    const sub = (type === 'host' && whitelabelSub)
      ? whitelabelSub
      : subMap[u._id.toString()];

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
  const activeSubs = await Subscription.findActiveForUser(context.userId);
  const subscription = activeSubs[0] || null;
  const eventsService = require('../events/events.service');
  return eventsService.createEvent(eventData, guestList, { ...context, subscription });
}

/**
 * Update event status (admin action)
 */
async function updateEventStatus(eventId, status, whitelabelId = undefined) {
  const query = { _id: eventId };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const current = await Event.findOne(query).select('status previousStatus');
  if (!current) {
    throw new NotFoundError('Event');
  }

  const update = { status };

  if (status === 'cancelled') {
    // Save current status so we can restore it on reactivation
    update.previousStatus = current.status;
  } else if (current.status === 'cancelled') {
    // Reactivating: restore previous status if available, ignore passed status
    update.status = current.previousStatus || status;
    update.previousStatus = null;
  }

  const event = await Event.findOneAndUpdate(
    query,
    update,
    { new: true, runValidators: true }
  );

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
 * Delete event (admin action)
 */
async function deleteEvent(eventId, whitelabelId = undefined) {
  const query = { _id: eventId };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const event = await Event.findOne(query);
  if (!event) {
    throw new NotFoundError('Event');
  }

  event.status = EVENT_STATUS.DELETED;
  event.deletedAt = new Date();
  await event.save();

  return { success: true, message: 'Event deleted successfully' };
}

/**
 * Bulk delete events
 */
async function bulkDeleteEvents(eventIds, whitelabelId = undefined) {
  const query = { _id: { $in: eventIds } };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const result = await Event.updateMany(
    query,
    {
      status: EVENT_STATUS.DELETED,
      deletedAt: new Date(),
    }
  );

  return {
    success: true,
    deleted: result.modifiedCount,
    message: `${result.modifiedCount} event(s) deleted successfully`,
  };
}

/**
 * Export events
 */
async function exportEvents(whitelabelId, { search, status, from, to } = {}) {
  const query = { status: { $ne: 'deleted' } };
  if (whitelabelId !== undefined) query.whitelabelId = whitelabelId;
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
    .populate({ path: 'host', select: 'name username' })
    .sort({ createdAt: -1 })
    .lean();

  return events.map(e => ({
    Title: e.eventDetails?.eventName || e.eventDetails?.title || '-',
    Host: e.host?.name || e.host?.username || '-',
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
  deleteEvent,
  bulkDeleteEvents,
  exportEvents,
};

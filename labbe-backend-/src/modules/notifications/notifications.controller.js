/**
 * Notifications Controller
 * HTTP request handling only - delegates to notifications.service
 * @module modules/notifications/notifications.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendDeleted,
} = require("../../shared/utils/responseHelper");
const notificationsService = require("./notifications.service");
const { ROLES } = require("../../shared/constants");
const { logAudit } = require("../../shared/utils/auditLog");

/**
 * Get user notifications
 * GET /api/v2/notifications
 */
exports.getNotifications = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };

  const result = await notificationsService.getUserNotifications(
    req.user._id,
    filters,
    options
  );

  sendSuccess(res, {
    notifications: result.notifications,
    pagination: result.pagination,
    unreadCount: result.unreadCount,
  });
});

/**
 * Get unread count
 * GET /api/v2/notifications/unread-count
 */
exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationsService.getUnreadCount(req.user._id);

  sendSuccess(res, { unreadCount: count });
});

/**
 * Mark notification as read
 * PATCH /api/v2/notifications/:id/read
 */
exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationsService.markAsRead(
    req.params.id,
    req.user._id
  );

  sendSuccess(res, { notification }, "Notification marked as read");
});

/**
 * Mark all notifications as read
 * PATCH /api/v2/notifications/read-all
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
  const count = await notificationsService.markAllAsRead(req.user._id);

  sendSuccess(res, { markedCount: count }, "All notifications marked as read");
});

/**
 * Delete notification
 * DELETE /api/v2/notifications/:id
 */
exports.deleteNotification = catchAsync(async (req, res) => {
  await notificationsService.deleteNotification(req.params.id, req.user._id);

  sendDeleted(res, "Notification deleted");
});

/**
 * Delete all read notifications
 * DELETE /api/v2/notifications/read
 */
exports.deleteAllRead = catchAsync(async (req, res) => {
  const count = await notificationsService.deleteAllRead(req.user._id);

  sendSuccess(res, { deletedCount: count }, "Read notifications deleted");
});

/**
 * Clear all notifications
 * DELETE /api/v2/notifications/clear-all
 */
exports.clearAllNotifications = catchAsync(async (req, res) => {
  const count = await notificationsService.clearAllNotifications(req.user._id);

  sendSuccess(res, { deletedCount: count }, "All notifications cleared");
});

/**
 * Get single notification
 * GET /api/v2/notifications/:id
 */
exports.getNotification = catchAsync(async (req, res) => {
  const notification = await notificationsService.getNotification(
    req.params.id,
    req.user._id
  );

  sendSuccess(res, { notification });
});

/**
 * Send notification to specific users (admin)
 * POST /api/v2/notifications/send
 */
exports.sendNotification = catchAsync(async (req, res) => {
  const { userIds, title, titleAr, message, messageAr, type, data } = req.body;

  const result = await notificationsService.sendToUsers(userIds, {
    type: type || "custom",
    title,
    titleAr,
    message,
    messageAr,
    data,
  });

  sendSuccess(res, result, "Notification sent");
});

/**
 * Broadcast notification to role or all users (admin)
 * POST /api/v2/notifications/broadcast
 */
exports.broadcastNotification = catchAsync(async (req, res) => {
  const { role, title, titleAr, message, messageAr, type, whitelabelId } =
    req.body;

  // TENANT-F03: non-SUPER_ADMIN users can only broadcast within their own tenant
  const effectiveWhitelabelId =
    req.user.role === ROLES.SUPER_ADMIN
      ? whitelabelId || null
      : req.user.whitelabelId || null;

  const result = await notificationsService.broadcast({
    role,
    whitelabelId: effectiveWhitelabelId,
    type: type || "announcement",
    title,
    titleAr,
    message,
    messageAr,
  });

  logAudit({
    action: 'notification.broadcast',
    actor: { _id: req.user._id, role: req.user.role },
    targetType: 'notification',
    metadata: {
      targetRole: role || 'all',
      whitelabelId: effectiveWhitelabelId,
      recipientCount: result?.count,
    },
  }).catch(() => {});

  sendSuccess(res, result, "Broadcast sent");
});

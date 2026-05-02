/**
 * Notifications Service
 * Business logic for notification management - NO HTTP concerns
 * @module modules/notifications/notifications.service
 */

const { NotFoundError } = require("../../shared/errors");
const { USER_STATUS } = require("../../shared/constants");

// Import existing models during migration
const Notification = require("../../../models/NotificationModel");

class NotificationsService {
  /**
   * Send notification to a specific user (in-app + optional email)
   * @param {string} userId - User ID
   * @param {Object} notificationData - Notification data
   * @param {boolean} [sendEmail=false] - Whether to also send email
   * @returns {Promise<Object>}
   */
  async sendToUser(userId, notificationData, sendEmail = false) {
    // Create in-app notification
    const notification = await this.createNotification(userId, notificationData);

    // Send email if requested and user has email preference enabled
    if (sendEmail) {
      const User = require("../../../models/UserModel");
      const user = await User.findById(userId).select("email notificationPreferences");

      if (user?.email && this._shouldSendEmail(user, notificationData.type)) {
        const emailModule = require("../../infrastructure/email");
        await emailModule.send.notification(user.email, {
          title: notificationData.title,
          message: notificationData.message,
          actionUrl: notificationData.actionUrl,
        });
      }
    }

    return notification;
  }

  /**
   * Send notification to all admins
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>}
   */
  async sendToAdmins(notificationData) {
    const User = require("../../../models/UserModel");
    const { ROLES } = require("../../shared/constants");

    // Find all admin users
    const admins = await User.find({
      role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
      status: USER_STATUS.ACTIVE,
    }).select("_id");

    if (admins.length === 0) {
      return { sentCount: 0 };
    }

    // Send to all admins
    const notifications = await Promise.all(
      admins.map((admin) =>
        this.createNotification(admin._id, notificationData).catch((err) => {
          console.error(`Failed to notify admin ${admin._id}:`, err);
          return null;
        })
      )
    );

    return {
      sentCount: notifications.filter((n) => n !== null).length,
      totalAdmins: admins.length,
    };
  }

  /**
   * Check if should send email based on user preferences
   * @private
   */
  _shouldSendEmail(user, notificationType) {
    if (!user.notificationPreferences) return true;

    // Map notification types to preference keys
    const preferenceMap = {
      event_created: "eventUpdates",
      event_reminder: "eventReminders",
      guest_rsvp: "guestResponses",
    };

    const preferenceKey = preferenceMap[notificationType];
    if (!preferenceKey) return true;

    return user.notificationPreferences[preferenceKey] !== false;
  }

  /**
   * Create notification for a user
   * @param {string} userId - User ID
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>}
   */
  async createNotification(userId, notificationData) {
    const notification = await Notification.create({
      userId,
      type: notificationData.type || "custom",
      title: notificationData.title,
      titleAr: notificationData.titleAr,
      message: notificationData.message,
      messageAr: notificationData.messageAr,
      actionUrl: notificationData.actionUrl,
      data: notificationData.data,
      priority: notificationData.priority,
      isRead: false,
    });

    return this._formatNotification(notification);
  }

  /**
   * Get user notifications
   * @param {string} userId
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<{notifications: Array, pagination: Object, unreadCount: number}>}
   */
  async getUserNotifications(userId, filters = {}, options = {}) {
    const { isRead, type } = filters;
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query = { userId };

    if (isRead !== undefined) {
      query.isRead = isRead === "true" || isRead === true;
    }
    if (type) {
      query.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications: notifications.map((n) => this._formatNotification(n)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Get unread count
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, isRead: false });
  }

  /**
   * Mark notification as read
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError("Notification");
    }

    return this._formatNotification(notification);
  }

  /**
   * Mark all notifications as read
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return result.modifiedCount;
  }

  /**
   * Delete notification
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new NotFoundError("Notification");
    }
  }

  /**
   * Delete all read notifications
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async deleteAllRead(userId) {
    const result = await Notification.deleteMany({
      userId,
      isRead: true,
    });

    return result.deletedCount;
  }

  /**
   * Clear all notifications for user
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async clearAllNotifications(userId) {
    const result = await Notification.deleteMany({ userId });
    return result.deletedCount;
  }

  /**
   * Get single notification
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getNotification(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new NotFoundError("Notification");
    }

    return this._formatNotification(notification);
  }

  /**
   * Send notification to specific users
   * @param {string[]} userIds
   * @param {Object} notificationData
   * @returns {Promise<Object>}
   */
  async sendToUsers(userIds, notificationData) {
    const notifications = userIds.map((uid) => ({
      userId: uid,
      ...notificationData,
    }));

    const result = await Notification.insertMany(notifications);
    return { sentCount: result.length };
  }

  /**
   * Broadcast notification to role or all users
   * @param {Object} broadcastData
   * @returns {Promise<Object>}
   */
  async broadcast(broadcastData) {
    const { role, whitelabelId, ...notificationData } = broadcastData;
    const User = require("../../../models/UserModel");

    let query = { status: USER_STATUS.ACTIVE };
    if (role) query.role = role;
    if (whitelabelId) query.whitelabelId = whitelabelId;

    // Use cursor-based batching to avoid loading all users into memory
    const BATCH_SIZE = 500;
    let sentCount = 0;
    let skip = 0;
    let batch;

    do {
      batch = await User.find(query).select("_id").skip(skip).limit(BATCH_SIZE).lean();
      if (batch.length > 0) {
        const notifications = batch.map((u) => ({
          userId: u._id,
          ...notificationData,
        }));
        const result = await Notification.insertMany(notifications);
        sentCount += result.length;
      }
      skip += BATCH_SIZE;
    } while (batch.length === BATCH_SIZE);

    return { sentCount };
  }

  /**
   * Format notification for response
   * @private
   */
  _formatNotification(notification) {
    // Compute timeAgo from createdAt
    let timeAgo = "";
    if (notification.createdAt) {
      const now = new Date();
      const diff = now - new Date(notification.createdAt);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) timeAgo = `${days}d ago`;
      else if (hours > 0) timeAgo = `${hours}h ago`;
      else if (minutes > 0) timeAgo = `${minutes}m ago`;
      else timeAgo = "Just now";
    }

    return {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      titleAr: notification.titleAr,
      message: notification.message,
      messageAr: notification.messageAr,
      isRead: notification.isRead,
      readAt: notification.readAt,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
      actionType: notification.actionType,
      data: notification.data,
      timeAgo,
      createdAt: notification.createdAt,
    };
  }
}

module.exports = new NotificationsService();

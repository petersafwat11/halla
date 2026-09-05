/**
 * Notifications Service
 * Business logic for notification management - NO HTTP concerns
 * @module modules/notifications/notifications.service
 */

const { NotFoundError } = require("../../shared/errors");
const { USER_STATUS } = require("../../shared/constants");
const { withIdempotency, sha256 } = require("../../shared/utils/idempotency");

const Notification = require("../../../models/NotificationModel");
const pushService = require("./push.service");

// ============================================
// NOTIFICATION TYPE -> APP-PREFERENCE KEY
// Mirrors the toggles in NotificationPreferences UI. Any type not in this
// map bypasses the preference check (always delivered).
// ============================================
const APP_NOTIFICATION_TYPE_TO_PREF_KEY = {
  // Host — event-update bucket
  event_created: "eventUpdates",
  event_status_change: "eventUpdates",
  event_completed: "eventUpdates",
  event_cancelled: "eventUpdates",
  event_updated: "eventUpdates",
  event_deleted: "eventUpdates",
  event_launch_failed: "eventUpdates",
  event_partial_delivery_failed: "eventUpdates",
  event_unscheduled: "eventUpdates",
  invitations_sent: "eventUpdates",
  template_status_change: "eventUpdates",
  // Host — reminders
  event_reminder: "eventReminders",
  // Host — guest responses
  guest_rsvp: "guestResponses",
  guest_rsvp_accepted: "guestResponses",
  guest_rsvp_declined: "guestResponses",
  // Host — guest check-ins
  guest_checked_in: "guestCheckIns",
  // Host — subscription/plan alerts
  subscription_activated: "subscriptionAlerts",
  subscription_expiring: "subscriptionAlerts",
  subscription_expired: "subscriptionAlerts",
  subscription_renewed: "subscriptionAlerts",
  subscription_renewal_invoice: "subscriptionAlerts",
  subscription_updated: "subscriptionAlerts",
  plan_limit_warning: "subscriptionAlerts",
  // Host — payment status alerts
  payment_successful: "subscriptionAlerts",
  payment_failed: "subscriptionAlerts",
  payment_refunded: "subscriptionAlerts",
  payment_partially_refunded: "subscriptionAlerts",
  payment_voided: "subscriptionAlerts",
  // Host — system / welcome
  welcome: "systemUpdates",
  account_status_change: "systemUpdates",
  announcement: "systemUpdates",
};

class NotificationsService {
  /**
   * Send notification to a specific user (in-app + optional email)
   * @param {string} userId - User ID
   * @param {Object} notificationData - Notification data
   * @param {boolean} [sendEmail=false] - Whether to also send email
   * @returns {Promise<Object>}
   */
  async sendToUser(userIdOrDoc, notificationData, sendEmail = false) {
    const userId =
      userIdOrDoc?._id
        ? userIdOrDoc._id.toString()
        : typeof userIdOrDoc === "string"
        ? userIdOrDoc
        : userIdOrDoc?.id
        ? String(userIdOrDoc.id)
        : String(userIdOrDoc);

    const User = require("../../../models/UserModel");
    const user = await User.findById(userId).select("email notificationPreferences");

    if (!this._shouldDeliverApp(user, notificationData.type)) {
      return null;
    }

    // Create in-app notification
    const notification = await this.createNotification(userId, notificationData);

    // Send email if requested and user has email preference enabled
    if (sendEmail) {
      if (user?.email && this._shouldSendEmail(user, notificationData.type)) {
        // Attempt email delivery and write status back to the Notification
        // record. NotificationModel has a structured deliveryStatus.email
        // sub-document ({ sent, sentAt, error }), so we use that shape rather
        // than a flat string field. The email provider (SMTP via nodemailer)
        // does not expose delivery receipts synchronously; we record
        // `sent:true/sentAt:now` on a successful API call and `error` on failure.
        const emailModule = require("../../infrastructure/email");
        let emailSent = false;
        let emailError = null;

        try {
          await emailModule.send.notification(user.email, {
            title: notificationData.title,
            message: notificationData.message,
            actionUrl: notificationData.actionUrl,
          });
          emailSent = true;
        } catch (emailErr) {
          emailError = emailErr?.message || "email_send_failed";
          console.error(`[Notifications] email delivery failed for user ${userId}:`, emailError);
        }

        // Write delivery status back to the persisted notification document.
        // Best-effort — do not throw if the writeback itself fails.
        if (notification?.id) {
          const writeUpdate = emailSent
            ? { "deliveryStatus.email.sent": true, "deliveryStatus.email.sentAt": new Date() }
            : { "deliveryStatus.email.sent": false, "deliveryStatus.email.error": emailError };
          await Notification.findByIdAndUpdate(notification.id, { $set: writeUpdate }).catch(
            (err) => console.error("[Notifications] deliveryStatus writeback failed:", err.message)
          );
        }
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
   * Send notification to all platform-wide admins, super admins, and moderators
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>}
   */
  async sendToPlatformAdmins(notificationData) {
    const User = require("../../../models/UserModel");
    const { ROLES, USER_STATUS } = require("../../shared/constants");

    // Find active platform admins/super admins/moderators
    const platformAdmins = await User.find({
      role: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR] },
      status: USER_STATUS.ACTIVE,
    }).select("_id");

    if (platformAdmins.length === 0) {
      return { sentCount: 0 };
    }

    // Send to all platform admins in parallel
    const notifications = await Promise.all(
      platformAdmins.map((admin) =>
        this.createNotification(admin._id, notificationData).catch((err) => {
          console.error(`Failed to notify platform admin ${admin._id}:`, err);
          return null;
        })
      )
    );

    return {
      sentCount: notifications.filter((n) => n !== null).length,
      totalPlatformAdmins: platformAdmins.length,
    };
  }

  /**
   * Decide whether to create the in-app notification for this user.
   * Returns false ONLY when the user has explicitly toggled off the
   * matching preference key. Unknown types and missing prefs both
   * default to delivery.
   * @private
   */
  _shouldDeliverApp(user, notificationType) {
    const prefKey = APP_NOTIFICATION_TYPE_TO_PREF_KEY[notificationType];
    if (!prefKey) return true; // no mapping → always deliver
    const appPrefs = user?.notificationPreferences?.appNotifications;
    if (!appPrefs) return true; // no record → defaults all-on
    return appPrefs[prefKey] !== false;
  }

  /**
   * Check if should send email based on user preferences. Host email
   * preferences were removed (plan/payment emails always fire and do not
   * route through this service), so this is now only consulted by
   * admin-targeted email flows that may layer in their own
   * preference keys later.
   * @private
   */
  _shouldSendEmail(user, notificationType) {
    if (!user?.notificationPreferences?.emailNotifications) return true;
    const prefKey = APP_NOTIFICATION_TYPE_TO_PREF_KEY[notificationType];
    if (!prefKey) return true;
    return user.notificationPreferences.emailNotifications[prefKey] !== false;
  }

  /**
   * Create notification for a user
   *
   * Idempotency guard via withIdempotency utility.
   * Key: `notification:<userId>:<type>:<targetId>` (targetId = data.entityId).
   * TTL is managed by the IdempotencyKeyModel (24h default).
   * Prevents duplicate notifications from double-firing cron ticks or retries.
   *
   * @param {string} userId - User ID
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>}
   */
  async createNotification(userId, notificationData) {
    const type = notificationData.type || "custom";
    const targetId = notificationData.data?.entityId || "none";
    const idempotencyKey = notificationData.idempotencyKey || `notification:${userId}:${type}:${targetId}`;

    // Build a stable request hash from the notification payload so that a
    // retry with the same intent matches (same result returned) but a genuinely
    // different notification payload (e.g. two distinct event_reminder types
    // for different events) is treated as a new record.
    const requestHash = sha256({ userId: String(userId), type, targetId });

    return withIdempotency(
      idempotencyKey,
      async () => {
        const notification = await Notification.create({
          userId,
          type,
          title: notificationData.title,
          titleAr: notificationData.titleAr,
          message: notificationData.message,
          messageAr: notificationData.messageAr,
          actionUrl: notificationData.actionUrl,
          data: notificationData.data || {},
          priority: notificationData.priority,
          isRead: false,
        });

        // Best-effort push fan-out to the user's devices. Fires once per
        // idempotency key (inside this guarded block), never awaited so it
        // can't delay or fail in-app notification creation. The data payload
        // carries what the client needs to deep-link on tap.
        pushService
          .sendToUser(userId, {
            title: notificationData.title,
            titleAr: notificationData.titleAr,
            body: notificationData.message,
            bodyAr: notificationData.messageAr,
            data: {
              type,
              notificationId: String(notification._id),
              entityId: notificationData.data?.entityId,
              actionUrl: notificationData.actionUrl,
            },
          })
          .catch(() => {});

        return this._formatNotification(notification);
      },
      {
        scope: "notification.create",
        requestHash,
        userId: String(userId),
      }
    );
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
    const { role, ...notificationData } = broadcastData;
    const User = require("../../../models/UserModel");

    let query = { status: USER_STATUS.ACTIVE };
    if (role) query.role = role;

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

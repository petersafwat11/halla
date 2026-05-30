/**
 * Notification Model
 * Handles all notification-related data storage and retrieval
 * Supports role-based notifications with multi-tenant (whitelabel) support
 */

const mongoose = require("mongoose");

// ============================================
// CONSTANTS
// ============================================

const NOTIFICATION_TYPES = {
  // Event notifications
  EVENT_CREATED: "event_created",
  EVENT_REMINDER: "event_reminder",
  EVENT_STATUS_CHANGE: "event_status_change",
  EVENT_COMPLETED: "event_completed",
  EVENT_CANCELLED: "event_cancelled",

  // Guest notifications
  GUEST_RSVP_ACCEPTED: "guest_rsvp_accepted",
  GUEST_RSVP_DECLINED: "guest_rsvp_declined",
  GUEST_RSVP_MAYBE: "guest_rsvp_maybe",
  GUEST_CHECKED_IN: "guest_checked_in",
  INVITATIONS_SENT: "invitations_sent",
  TEMPLATE_STATUS_CHANGE: "template_status_change",

  // Subscription notifications
  SUBSCRIPTION_EXPIRING: "subscription_expiring",
  SUBSCRIPTION_RENEWED: "subscription_renewed",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  PLAN_LIMIT_WARNING: "plan_limit_warning",
  PAYMENT_SUCCESSFUL: "payment_successful",
  PAYMENT_FAILED: "payment_failed",

  // User notifications
  NEW_USER: "new_user",
  USER_REGISTERED: "user_registered",
  VENDOR_PENDING_APPROVAL: "vendor_pending_approval",
  VENDOR_APPROVED: "vendor_approved",
  VENDOR_REJECTED: "vendor_rejected",
  WHITELABEL_REGISTERED: "whitelabel_registered",
  PROFILE_INCOMPLETE: "profile_incomplete",
  WELCOME: "welcome",

  // Support notifications
  TICKET_CREATED: "ticket_created",
  TICKET_ASSIGNED: "ticket_assigned",
  TICKET_RESPONSE: "ticket_response",
  TICKET_RESOLVED: "ticket_resolved",

  // Admin notifications
  SYSTEM_ALERT: "system_alert",
  REVENUE_REPORT: "revenue_report",
  USAGE_REPORT: "usage_report",

  // General
  ANNOUNCEMENT: "announcement",
  CUSTOM: "custom",
};

const NOTIFICATION_PRIORITIES = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
};

const ENTITY_TYPES = {
  EVENT: "event",
  USER: "user",
  TICKET: "ticket",
  SUBSCRIPTION: "subscription",
  SERVICE: "service",
  GUEST: "guest",
};

// ============================================
// SCHEMA DEFINITION
// ============================================

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Notification must have a recipient"],
      index: true,
    },

    // Multi-tenant support
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Notification type
    type: {
      type: String,
      required: [true, "Notification must have a type"],
      enum: Object.values(NOTIFICATION_TYPES),
      index: true,
    },

    // Display content (English)
    title: {
      type: String,
      required: [true, "Notification must have a title"],
      maxlength: [200, "Title cannot exceed 200 characters"],
      trim: true,
    },

    message: {
      type: String,
      required: [true, "Notification must have a message"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
      trim: true,
    },

    // Display content (Arabic)
    titleAr: {
      type: String,
      maxlength: [200, "Arabic title cannot exceed 200 characters"],
      trim: true,
    },

    messageAr: {
      type: String,
      maxlength: [1000, "Arabic message cannot exceed 1000 characters"],
      trim: true,
    },

    // Reference data for linking to related entities
    data: {
      entityType: {
        type: String,
        enum: [...Object.values(ENTITY_TYPES), null],
        default: null,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    // Action configuration
    actionUrl: {
      type: String,
      trim: true,
    },

    actionType: {
      type: String,
      enum: ["navigate", "modal", "external", null],
      default: null,
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // Priority level
    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITIES),
      default: NOTIFICATION_PRIORITIES.NORMAL,
    },

    // Delivery channels configuration
    channels: {
      app: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },

    // Delivery status tracking
    deliveryStatus: {
      app: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, default: null },
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, default: null },
        error: { type: String, default: null },
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, default: null },
        error: { type: String, default: null },
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date, default: null },
        error: { type: String, default: null },
      },
    },

    // Auto-expiration (TTL index defined below)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },

    // Scheduled notifications
    scheduledFor: {
      type: Date,
      default: null,
    },

    isScheduled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

// Compound indexes for common queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ whitelabelId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ isScheduled: 1, scheduledFor: 1 });

// TTL index for auto-deletion
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================
// VIRTUALS
// ============================================

notificationSchema.virtual("isExpired").get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

notificationSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

/**
 * Get localized content based on language preference
 */
notificationSchema.methods.getLocalizedContent = function (lang = "en") {
  return {
    title: lang === "ar" && this.titleAr ? this.titleAr : this.title,
    message: lang === "ar" && this.messageAr ? this.messageAr : this.message,
  };
};

/**
 * Convert to client-safe format
 */
notificationSchema.methods.toClientJSON = function (lang = "en") {
  const localized = this.getLocalizedContent(lang);
  return {
    id: this._id,
    type: this.type,
    title: localized.title,
    message: localized.message,
    isRead: this.isRead,
    readAt: this.readAt,
    priority: this.priority,
    data: this.data,
    actionUrl: this.actionUrl,
    actionType: this.actionType,
    timeAgo: this.timeAgo,
    createdAt: this.createdAt,
  };
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get unread count for a user
 */
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ userId, isRead: false });
};

/**
 * Get notifications for a user with pagination
 */
notificationSchema.statics.getForUser = async function (userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    isRead = null,
    priority = null,
  } = options;

  const query = { userId };

  if (type) query.type = type;
  if (isRead !== null) query.isRead = isRead;
  if (priority) query.priority = priority;

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};

/**
 * Mark all notifications as read for a user
 */
notificationSchema.statics.markAllAsRead = async function (userId) {
  const result = await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result.modifiedCount;
};

/**
 * Delete all notifications for a user
 */
notificationSchema.statics.deleteAllForUser = async function (userId) {
  const result = await this.deleteMany({ userId });
  return result.deletedCount;
};

/**
 * Create notification for a single user
 */
notificationSchema.statics.createForUser = async function (userId, data) {
  const notification = await this.create({
    userId,
    ...data,
    deliveryStatus: {
      app: { sent: true, sentAt: new Date() },
    },
  });
  return notification;
};

/**
 * Create notifications for multiple users
 */
notificationSchema.statics.createForUsers = async function (userIds, data) {
  const notifications = userIds.map((userId) => ({
    userId,
    ...data,
    deliveryStatus: {
      app: { sent: true, sentAt: new Date() },
    },
  }));

  return this.insertMany(notifications);
};

/**
 * Create notifications for all users with a specific role
 */
notificationSchema.statics.createForRole = async function (
  role,
  data,
  whitelabelId = null
) {
  const User = mongoose.model("User");
  const query = { role, status: "active" };

  if (whitelabelId) {
    query.whitelabelId = whitelabelId;
  }

  const users = await User.find(query).select("_id").lean();

  if (users.length === 0) return [];

  const notifications = users.map((user) => ({
    userId: user._id,
    whitelabelId,
    ...data,
    deliveryStatus: {
      app: { sent: true, sentAt: new Date() },
    },
  }));

  return this.insertMany(notifications);
};

/**
 * Get scheduled notifications that are due
 */
notificationSchema.statics.getDueScheduled = async function () {
  return this.find({
    isScheduled: true,
    scheduledFor: { $lte: new Date() },
  });
};

/**
 * Process scheduled notifications
 */
notificationSchema.statics.processScheduled = async function () {
  const dueNotifications = await this.getDueScheduled();

  for (const notification of dueNotifications) {
    notification.isScheduled = false;
    notification.deliveryStatus.app.sent = true;
    notification.deliveryStatus.app.sentAt = new Date();
    await notification.save();
  }

  return dueNotifications.length;
};

// ============================================
// MIDDLEWARE
// ============================================

// Pre-save: Set Arabic content if not provided
notificationSchema.pre("save", function (next) {
  if (!this.titleAr) this.titleAr = this.title;
  if (!this.messageAr) this.messageAr = this.message;
  next();
});

// ============================================
// MODEL EXPORT
// ============================================

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.NOTIFICATION_PRIORITIES = NOTIFICATION_PRIORITIES;
module.exports.ENTITY_TYPES = ENTITY_TYPES;

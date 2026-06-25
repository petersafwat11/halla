const mongoose = require("mongoose");

/**
 * Notification Preferences Model
 * Stores user notification preferences for all roles with flexible schema
 * App notifications = notification bell + in-app notifications
 * Email notifications = emails sent to user's email address
 */
const notificationsSchema = new mongoose.Schema(
  {
    // Reference to User (unified model)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Notification preferences must belong to a user"],
      unique: true,
      index: true,
    },

    // User role for role-specific defaults
    role: {
      type: String,
      enum: [
        "host",
        "vendor",
        "admin",
        "super_admin",
        "moderator",
        "guest",
      ],
      default: "host",
    },

    // Backward compatibility alias
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // App Notifications (notification bell + in-app)
    // Using Mixed type for role-specific flexibility
    appNotifications: {
      type: mongoose.Schema.Types.Mixed,
      default: function () {
        return getDefaultAppNotifications(this.role);
      },
    },

    // Email Notifications
    emailNotifications: {
      type: mongoose.Schema.Types.Mixed,
      default: function () {
        return getDefaultEmailNotifications(this.role);
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: "notification_preferences",
  }
);

// Create indexes for better performance
notificationsSchema.index({ createdAt: 1 });
// host index is automatically created by unique: true

// Instance method to get notification preferences
notificationsSchema.methods.getNotificationPreferences = function () {
  return {
    appNotifications: this.appNotifications,
    emailNotifications: this.emailNotifications,
  };
};

// Static method to update notification preferences
notificationsSchema.statics.updateNotificationPreferences = function (
  id,
  preferences
) {
  return this.findByIdAndUpdate(
    id,
    { $set: preferences },
    { new: true, runValidators: true }
  );
};

// Static method to find notification preferences by host ID (backward compat)
notificationsSchema.statics.findByHost = function (hostId) {
  return this.findOne({ $or: [{ userId: hostId }, { host: hostId }] });
};

// Static method to find notification preferences by user ID
notificationsSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId });
};

// Static method to create notification preferences for any user role
notificationsSchema.statics.createForUser = function (
  userId,
  role = "host",
  preferences = {}
) {
  const defaultPreferences = {
    userId,
    role,
    host: role === "host" ? userId : undefined, // Backward compatibility
    appNotifications: {
      ...getDefaultAppNotifications(role),
      ...preferences.appNotifications,
    },
    emailNotifications: {
      ...getDefaultEmailNotifications(role),
      ...preferences.emailNotifications,
    },
  };

  return new this(defaultPreferences);
};

// Static method to create notification preferences for a host (backward compat)
notificationsSchema.statics.createForHost = function (
  hostId,
  preferences = {}
) {
  return this.createForUser(hostId, "host", preferences);
};

// ============================================
// ROLE-SPECIFIC DEFAULT PREFERENCES
// ============================================

/**
 * Get default app notifications for a role
 * App notifications = notification bell + in-app notifications
 */
function getDefaultAppNotifications(role) {
  switch (role) {
    case "host":
      return {
        eventUpdates: true,
        eventReminders: true,
        guestResponses: true,
        guestCheckIns: true,
        subscriptionAlerts: true,
        systemUpdates: true,
        supportTickets: true, // For ticket notifications
      };
    case "admin":
    case "super_admin":
    case "moderator":
      return {
        newUsers: true,
        vendorApprovals: true,
        supportTickets: true,
        systemAlerts: true,
        paymentAlerts: true,
        subscriptionAlerts: true,
      };
    default:
      return {
        systemUpdates: true,
        supportTickets: true, // For ticket notifications
      };
  }
}

/**
 * Get default email notifications for a role
 */
function getDefaultEmailNotifications(role) {
  switch (role) {
    case "host":
      // Host has no opt-in email preferences. Plan/payment emails always
      // fire (no preference check); every other host email was removed.
      return {};
    case "admin":
    case "super_admin":
    case "moderator":
      return {
        dailyReport: true,
        weeklyReport: true,
        vendorApprovals: true,
        supportTickets: false,
        criticalAlerts: true,
      };
    default:
      return {
        systemUpdates: false,
      };
  }
}

const Notifications = mongoose.model("Notifications", notificationsSchema);

// Export helpers for use in other modules
Notifications.getDefaultAppNotifications = getDefaultAppNotifications;
Notifications.getDefaultEmailNotifications = getDefaultEmailNotifications;

module.exports = Notifications;

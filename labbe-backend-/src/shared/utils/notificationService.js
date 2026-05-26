/**
 * Notification Service
 * Centralized service for creating and managing notifications
 * Provides helper functions for all notification types across all roles
 */

const Notification = require("../../../models/NotificationModel");
const NotificationPreferences = require("../../../models/NotificationPreferencesModel");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  ENTITY_TYPES,
} = require("../../../models/NotificationModel");

// ============================================
// NOTIFICATION TYPE TO PREFERENCE MAPPING
// Maps notification types to user preference keys
// If user has disabled a preference, we shouldn't send that notification
// ============================================

const NOTIFICATION_TYPE_TO_PREFERENCE = {
  // Host preferences mapping
  [NOTIFICATION_TYPES.EVENT_CREATED]: {
    app: "eventUpdates",
    email: "eventUpdates",
  },
  [NOTIFICATION_TYPES.EVENT_REMINDER]: {
    app: "eventReminders",
    email: "eventReminders",
  },
  [NOTIFICATION_TYPES.EVENT_STATUS_CHANGE]: {
    app: "eventUpdates",
    email: "eventUpdates",
  },
  [NOTIFICATION_TYPES.EVENT_COMPLETED]: {
    app: "eventUpdates",
    email: "eventUpdates",
  },
  [NOTIFICATION_TYPES.EVENT_CANCELLED]: {
    app: "eventUpdates",
    email: "eventUpdates",
  },
  [NOTIFICATION_TYPES.GUEST_RSVP_ACCEPTED]: {
    app: "guestResponses",
    email: "guestResponses",
  },
  [NOTIFICATION_TYPES.GUEST_RSVP_DECLINED]: {
    app: "guestResponses",
    email: "guestResponses",
  },
  [NOTIFICATION_TYPES.GUEST_RSVP_MAYBE]: {
    app: "guestResponses",
    email: "guestResponses",
  },
  [NOTIFICATION_TYPES.GUEST_CHECKED_IN]: {
    app: "guestCheckIns",
    email: "guestCheckIns",
  },
  [NOTIFICATION_TYPES.INVITATIONS_SENT]: {
    app: "eventUpdates",
    email: "invitationReports",
  },
  [NOTIFICATION_TYPES.TEMPLATE_STATUS_CHANGE]: {
    app: "eventUpdates",
    email: "eventUpdates",
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: {
    app: "subscriptionAlerts",
    email: "subscriptionAlerts",
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED]: {
    app: "subscriptionAlerts",
    email: "subscriptionAlerts",
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED]: {
    app: "subscriptionAlerts",
    email: "subscriptionAlerts",
  },
  [NOTIFICATION_TYPES.PLAN_LIMIT_WARNING]: {
    app: "subscriptionAlerts",
    email: "subscriptionAlerts",
  },
  [NOTIFICATION_TYPES.PAYMENT_SUCCESSFUL]: {
    app: "paymentAlerts",
    email: "paymentAlerts",
  },
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    app: "paymentAlerts",
    email: "paymentAlerts",
  },

  // Vendor preferences mapping
  [NOTIFICATION_TYPES.VENDOR_APPROVED]: {
    app: "approvalStatus",
    email: "approvalStatus",
  },
  [NOTIFICATION_TYPES.VENDOR_REJECTED]: {
    app: "approvalStatus",
    email: "approvalStatus",
  },
  [NOTIFICATION_TYPES.VENDOR_PENDING_APPROVAL]: {
    app: "approvalStatus",
    email: "approvalStatus",
  },
  [NOTIFICATION_TYPES.SERVICE_INQUIRY]: {
    app: "serviceInquiries",
    email: "serviceInquiries",
  },
  [NOTIFICATION_TYPES.NEW_REVIEW]: {
    app: "adminReviews",
    email: "adminReviews",
  },
  [NOTIFICATION_TYPES.SERVICE_VIEWS_MILESTONE]: {
    app: "profileViews",
    email: "profileViews",
  },

  // Admin preferences mapping
  [NOTIFICATION_TYPES.USER_REGISTERED]: { app: "newUsers", email: "newUsers" },
  [NOTIFICATION_TYPES.TICKET_CREATED]: {
    app: "supportTickets",
    email: "supportTickets",
  },
  [NOTIFICATION_TYPES.TICKET_ASSIGNED]: {
    app: "supportTickets",
    email: "supportTickets",
  },
  [NOTIFICATION_TYPES.TICKET_RESPONSE]: {
    app: "supportTickets",
    email: "supportTickets",
  },
  [NOTIFICATION_TYPES.TICKET_RESOLVED]: {
    app: "supportTickets",
    email: "supportTickets",
  },
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: {
    app: "systemAlerts",
    email: "criticalAlerts",
  },

  // General
  [NOTIFICATION_TYPES.ANNOUNCEMENT]: {
    app: "systemUpdates",
    email: "systemUpdates",
  },
  [NOTIFICATION_TYPES.WELCOME]: {
    app: "systemUpdates",
    email: "systemUpdates",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build notification data object with defaults
 */
const buildNotificationData = ({
  type,
  title,
  titleAr,
  message,
  messageAr,
  entityType = null,
  entityId = null,
  metadata = {},
  actionUrl = null,
  actionType = null,
  priority = NOTIFICATION_PRIORITIES.NORMAL,
  whitelabelId = null,
  channels = { app: true },
}) => ({
  type,
  title,
  titleAr: titleAr || title,
  message,
  messageAr: messageAr || message,
  data: {
    entityType,
    entityId,
    metadata,
  },
  actionUrl,
  actionType: actionType || (actionUrl ? "navigate" : null),
  priority,
  whitelabelId,
  channels,
});

/**
 * Check if user has enabled notifications for a specific type
 * Returns { app: boolean, email: boolean } indicating which channels are enabled
 * @param {string} userId - User ID
 * @param {string} notificationType - Notification type from NOTIFICATION_TYPES
 * @returns {Object} Channels enabled for this notification type
 */
const checkUserNotificationPreference = async (userId, notificationType) => {
  try {
    // Default to enabled if no preference mapping exists
    const preferenceMapping = NOTIFICATION_TYPE_TO_PREFERENCE[notificationType];
    if (!preferenceMapping) {
      return { app: true, email: true };
    }

    // Get user notification preferences
    const prefs = await NotificationPreferences.findOne({ userId });

    if (!prefs) {
      // No preferences set - use defaults (enabled)
      return { app: true, email: true };
    }

    // Check app notification preference
    const appPrefKey = preferenceMapping.app;
    const emailPrefKey = preferenceMapping.email;

    const appEnabled = prefs.appNotifications?.[appPrefKey] !== false;
    const emailEnabled = prefs.emailNotifications?.[emailPrefKey] !== false;

    return { app: appEnabled, email: emailEnabled };
  } catch (error) {
    console.error("Error checking notification preference:", error);
    // On error, default to enabled
    return { app: true, email: true };
  }
};

/**
 * Get dashboard base path for a role
 */
const getDashboardPath = (role) => {
  const paths = {
    host: "/host",
    vendor: "/vendor-dashboard",
    super_admin: "/admin-dash",
    admin: "/admin-dash",
    moderator: "/admin-dash",
    whitelabel_admin: "/admin-dash",
    whitelabel_moderator: "/admin-dash",
    guest: "/guest",
  };
  return paths[role] || "/";
};

// ============================================
// NOTIFICATION SERVICE CLASS
// ============================================

class NotificationService {
  // ==========================================
  // CORE METHODS
  // ==========================================

  /**
   * Send notification to a single user
   * Respects user notification preferences - won't send if user has disabled this type
   */
  async sendToUser(userId, notificationData, skipPreferenceCheck = false) {
    try {
      // Check user preferences unless explicitly skipped
      if (!skipPreferenceCheck && notificationData.type) {
        const prefs = await checkUserNotificationPreference(
          userId,
          notificationData.type
        );

        // If user has disabled app notifications for this type, don't create it
        if (!prefs.app) {
          return null;
        }

        // Update channels based on preferences
        notificationData.channels = {
          ...notificationData.channels,
          app: prefs.app,
          email: prefs.email && notificationData.channels?.email,
        };
      }

      const result = await Notification.createForUser(userId, notificationData);
      return result;
    } catch (error) {
      console.error("NotificationService.sendToUser error:", error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds, notificationData) {
    try {
      if (!userIds || userIds.length === 0) return [];
      return await Notification.createForUsers(userIds, notificationData);
    } catch (error) {
      console.error("NotificationService.sendToUsers error:", error);
      throw error;
    }
  }

  /**
   * Send notification to all users with a specific role
   */
  async sendToRole(role, notificationData, whitelabelId = null) {
    try {
      return await Notification.createForRole(
        role,
        notificationData,
        whitelabelId
      );
    } catch (error) {
      console.error("NotificationService.sendToRole error:", error);
      throw error;
    }
  }

  /**
   * Send notification to admins (super_admin and admin)
   */
  async sendToAdmins(notificationData) {
    try {
      const superAdminNotifs = await this.sendToRole(
        "super_admin",
        notificationData
      );
      const adminNotifs = await this.sendToRole("admin", notificationData);
      return [...superAdminNotifs, ...adminNotifs];
    } catch (error) {
      console.error("NotificationService.sendToAdmins error:", error);
      throw error;
    }
  }

  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(userId, notificationData, scheduledFor) {
    try {
      return await Notification.create({
        userId,
        ...notificationData,
        isScheduled: true,
        scheduledFor,
      });
    } catch (error) {
      console.error("NotificationService.scheduleNotification error:", error);
      throw error;
    }
  }

  // ==========================================
  // EVENT NOTIFICATIONS
  // ==========================================

  /**
   * Notify host when event is created
   */
  async notifyEventCreated(event, host) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.EVENT_CREATED,
        title: "Event Created Successfully",
        titleAr: "تم إنشاء الفعالية بنجاح",
        message: `Your event "${eventTitle}" has been created successfully.`,
        messageAr: `تم إنشاء فعاليتك "${eventTitle}" بنجاح.`,
        entityType: ENTITY_TYPES.EVENT,
        entityId: event._id,
        actionUrl: `${getDashboardPath("host")}/events/${event._id}`,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  /**
   * Notify host about upcoming event
   */
  async notifyEventReminder(event, host, hoursUntil) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";
    const timeText =
      hoursUntil >= 24
        ? `${Math.floor(hoursUntil / 24)} day(s)`
        : `${hoursUntil} hour(s)`;
    const timeTextAr =
      hoursUntil >= 24
        ? `${Math.floor(hoursUntil / 24)} يوم`
        : `${hoursUntil} ساعة`;

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.EVENT_REMINDER,
        title: "Event Reminder",
        titleAr: "تذكير بالفعالية",
        message: `Your event "${eventTitle}" starts in ${timeText}.`,
        messageAr: `فعاليتك "${eventTitle}" تبدأ خلال ${timeTextAr}.`,
        entityType: ENTITY_TYPES.EVENT,
        entityId: event._id,
        actionUrl: `${getDashboardPath("host")}/events/${event._id}`,
        priority:
          hoursUntil <= 1
            ? NOTIFICATION_PRIORITIES.HIGH
            : NOTIFICATION_PRIORITIES.NORMAL,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  /**
   * Notify host about event status change
   */
  async notifyEventStatusChange(event, host, oldStatus, newStatus) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.EVENT_STATUS_CHANGE,
        title: "Event Status Updated",
        titleAr: "تم تحديث حالة الفعالية",
        message: `Your event "${eventTitle}" status changed from ${oldStatus} to ${newStatus}.`,
        messageAr: `تم تغيير حالة فعاليتك "${eventTitle}" من ${oldStatus} إلى ${newStatus}.`,
        entityType: ENTITY_TYPES.EVENT,
        entityId: event._id,
        metadata: { oldStatus, newStatus },
        actionUrl: `${getDashboardPath("host")}/events/${event._id}`,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  /**
   * Notify host about event completion
   */
  async notifyEventCompleted(event, host) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.EVENT_COMPLETED,
        title: "Event Completed",
        titleAr: "اكتملت الفعالية",
        message: `Your event "${eventTitle}" has been completed successfully.`,
        messageAr: `اكتملت فعاليتك "${eventTitle}" بنجاح.`,
        entityType: ENTITY_TYPES.EVENT,
        entityId: event._id,
        actionUrl: `${getDashboardPath("host")}/events/${event._id}`,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  // ==========================================
  // GUEST NOTIFICATIONS
  // ==========================================

  /**
   * Notify host about guest RSVP response
   */
  async notifyGuestRSVP(event, host, guest, response) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";
    const guestName = guest.name || "A guest";

    const typeMap = {
      confirmed: NOTIFICATION_TYPES.GUEST_RSVP_ACCEPTED,
      declined: NOTIFICATION_TYPES.GUEST_RSVP_DECLINED,
      maybe: NOTIFICATION_TYPES.GUEST_RSVP_MAYBE,
    };

    const responseText = {
      confirmed: "accepted",
      declined: "declined",
      maybe: "responded maybe to",
    };

    const responseTextAr = {
      confirmed: "قبل",
      declined: "رفض",
      maybe: "ربما يحضر",
    };

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: typeMap[response] || NOTIFICATION_TYPES.GUEST_RSVP_ACCEPTED,
        title: "Guest RSVP Response",
        titleAr: "رد الضيف على الدعوة",
        message: `${guestName} has ${responseText[response] || "responded to"} your invitation to "${eventTitle}".`,
        messageAr: `${guestName} ${responseTextAr[response] || "رد على"} دعوتك لفعالية "${eventTitle}".`,
        entityType: ENTITY_TYPES.GUEST,
        entityId: guest._id,
        metadata: { eventId: event._id, response },
        actionUrl: `${getDashboardPath("host")}/events/${event._id}/guests`,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  /**
   * Notify host about guest check-in
   */
  async notifyGuestCheckIn(event, host, guest) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";
    const guestName = guest.name || "A guest";

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.GUEST_CHECKED_IN,
        title: "Guest Checked In",
        titleAr: "تسجيل دخول ضيف",
        message: `${guestName} has checked in to "${eventTitle}".`,
        messageAr: `${guestName} سجل دخوله لفعالية "${eventTitle}".`,
        entityType: ENTITY_TYPES.GUEST,
        entityId: guest._id,
        metadata: { eventId: event._id },
        actionUrl: `${getDashboardPath("host")}/events/${event._id}/guests`,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  /**
   * Notify host when WhatsApp template status changes (approved/rejected)
   */
  async notifyTemplateStatusChange(event, host, status, rejectionReason = null) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";
    const isApproved = status === 'approved';

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.TEMPLATE_STATUS_CHANGE,
        title: isApproved ? "WhatsApp Template Approved" : "WhatsApp Template Rejected",
        titleAr: isApproved ? "تمت الموافقة على قالب واتساب" : "تم رفض قالب واتساب",
        message: isApproved
          ? `Your WhatsApp template for "${eventTitle}" has been approved. You can now send test messages.`
          : `Your WhatsApp template for "${eventTitle}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        messageAr: isApproved
          ? `تمت الموافقة على قالب واتساب لفعالية "${eventTitle}". يمكنك الآن إرسال رسائل تجريبية.`
          : `تم رفض قالب واتساب لفعالية "${eventTitle}".${rejectionReason ? ` السبب: ${rejectionReason}` : ''}`,
        entityType: ENTITY_TYPES.EVENT,
        entityId: event._id,
        metadata: { templateStatus: status, rejectionReason },
        actionUrl: `${getDashboardPath("host")}`,
        priority: isApproved ? NOTIFICATION_PRIORITIES.NORMAL : NOTIFICATION_PRIORITIES.HIGH,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  /**
   * Notify host about invitations sent
   */
  async notifyInvitationsSent(event, host, count) {
    const eventTitle = event.eventDetails?.title || "Untitled Event";

    return this.sendToUser(
      host._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.INVITATIONS_SENT,
        title: "Invitations Sent",
        titleAr: "تم إرسال الدعوات",
        message: `${count} invitation(s) have been sent for "${eventTitle}".`,
        messageAr: `تم إرسال ${count} دعوة لفعالية "${eventTitle}".`,
        entityType: ENTITY_TYPES.EVENT,
        entityId: event._id,
        metadata: { count },
        actionUrl: `${getDashboardPath("host")}/events/${event._id}/guests`,
        whitelabelId: event.whitelabelId,
      })
    );
  }

  // ==========================================
  // SUBSCRIPTION NOTIFICATIONS
  // ==========================================

  /**
   * Notify user about subscription expiring
   */
  async notifySubscriptionExpiring(subscription, user, daysLeft) {
    const priority =
      daysLeft <= 1
        ? NOTIFICATION_PRIORITIES.URGENT
        : daysLeft <= 3
          ? NOTIFICATION_PRIORITIES.HIGH
          : NOTIFICATION_PRIORITIES.NORMAL;

    const dashboardPath = getDashboardPath(user.role);

    return this.sendToUser(
      user._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
        title: "Subscription Expiring Soon",
        titleAr: "اشتراكك على وشك الانتهاء",
        message: `Your ${subscription.planType} subscription expires in ${daysLeft} day(s). Renew now to continue.`,
        messageAr: `ينتهي اشتراكك ${subscription.planType} خلال ${daysLeft} يوم. جدد الآن للاستمرار.`,
        entityType: ENTITY_TYPES.SUBSCRIPTION,
        entityId: subscription._id,
        metadata: { daysLeft, planType: subscription.planType },
        actionUrl: `${dashboardPath}/subscription`,
        priority,
        whitelabelId: subscription.whitelabelId,
      })
    );
  }

  /**
   * Notify user about subscription renewed
   */
  async notifySubscriptionRenewed(subscription, user) {
    const dashboardPath = getDashboardPath(user.role);

    return this.sendToUser(
      user._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED,
        title: "Subscription Renewed",
        titleAr: "تم تجديد الاشتراك",
        message: `Your ${subscription.planType} subscription has been renewed successfully.`,
        messageAr: `تم تجديد اشتراكك ${subscription.planType} بنجاح.`,
        entityType: ENTITY_TYPES.SUBSCRIPTION,
        entityId: subscription._id,
        actionUrl: `${dashboardPath}/subscription`,
        whitelabelId: subscription.whitelabelId,
      })
    );
  }

  /**
   * Notify user about plan limit warning
   */
  async notifyPlanLimitWarning(subscription, user, limitType, usage, limit) {
    const dashboardPath = getDashboardPath(user.role);
    const percentage = Math.round((usage / limit) * 100);

    return this.sendToUser(
      user._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.PLAN_LIMIT_WARNING,
        title: "Plan Limit Warning",
        titleAr: "تحذير حد الباقة",
        message: `You've used ${usage} of ${limit} ${limitType} (${percentage}%). Consider upgrading your plan.`,
        messageAr: `لقد استخدمت ${usage} من ${limit} ${limitType} (${percentage}%). فكر في ترقية باقتك.`,
        entityType: ENTITY_TYPES.SUBSCRIPTION,
        entityId: subscription._id,
        metadata: { limitType, usage, limit, percentage },
        actionUrl: `${dashboardPath}/subscription`,
        priority:
          percentage >= 100
            ? NOTIFICATION_PRIORITIES.HIGH
            : NOTIFICATION_PRIORITIES.NORMAL,
        whitelabelId: subscription.whitelabelId,
      })
    );
  }

  // ==========================================
  // ADMIN NOTIFICATIONS
  // ==========================================

  /**
   * Notify admins about new vendor registration
   */
  async notifyNewVendorRegistration(vendor) {
    const vendorName = vendor.profile?.vendorData?.brandName || vendor.username;

    return this.sendToAdmins(
      buildNotificationData({
        type: NOTIFICATION_TYPES.VENDOR_PENDING_APPROVAL,
        title: "New Vendor Registration",
        titleAr: "تسجيل تاجر جديد",
        message: `New vendor "${vendorName}" is pending approval.`,
        messageAr: `تاجر جديد "${vendorName}" بانتظار الموافقة.`,
        entityType: ENTITY_TYPES.USER,
        entityId: vendor._id,
        actionUrl: `${getDashboardPath("admin")}/vendors/${vendor._id}`,
      })
    );
  }

  /**
   * Notify super admins about new whitelabel registration
   */
  async notifyNewWhitelabelRegistration(whitelabel) {
    const platformName =
      whitelabel.profile?.whitelabelData?.platformName || whitelabel.username;

    return this.sendToRole(
      "super_admin",
      buildNotificationData({
        type: NOTIFICATION_TYPES.WHITELABEL_REGISTERED,
        title: "New WhiteLabel Registration",
        titleAr: "تسجيل منصة جديدة",
        message: `New whitelabel "${platformName}" has registered.`,
        messageAr: `منصة جديدة "${platformName}" تم تسجيلها.`,
        entityType: ENTITY_TYPES.USER,
        entityId: whitelabel._id,
        actionUrl: `${getDashboardPath("super_admin")}/whitelabels/${whitelabel._id}`,
      })
    );
  }

  /**
   * Notify about new support ticket
   */
  async notifyTicketCreated(ticket, assignToUserId = null) {
    const notifications = [];

    // Notify admins
    const adminNotif = this.sendToAdmins(
      buildNotificationData({
        type: NOTIFICATION_TYPES.TICKET_CREATED,
        title: "New Support Ticket",
        titleAr: "تذكرة دعم جديدة",
        message: `New ${ticket.priority || "normal"} priority ticket: "${(ticket.message || "").substring(0, 50)}..."`,
        messageAr: `تذكرة جديدة بأولوية ${ticket.priority || "عادية"}: "${(ticket.message || "").substring(0, 50)}..."`,
        entityType: ENTITY_TYPES.TICKET,
        entityId: ticket._id,
        actionUrl: `${getDashboardPath("admin")}/tickets/${ticket._id}`,
        priority:
          ticket.priority === "urgent"
            ? NOTIFICATION_PRIORITIES.HIGH
            : NOTIFICATION_PRIORITIES.NORMAL,
        whitelabelId: ticket.whitelabelId,
      })
    );
    notifications.push(adminNotif);

    // Notify assigned user if specified
    if (assignToUserId) {
      const assignedNotif = this.sendToUser(
        assignToUserId,
        buildNotificationData({
          type: NOTIFICATION_TYPES.TICKET_ASSIGNED,
          title: "Ticket Assigned to You",
          titleAr: "تم تعيين تذكرة لك",
          message: `A ${ticket.priority || "normal"} priority ticket has been assigned to you.`,
          messageAr: `تم تعيين تذكرة بأولوية ${ticket.priority || "عادية"} لك.`,
          entityType: ENTITY_TYPES.TICKET,
          entityId: ticket._id,
          actionUrl: `${getDashboardPath("admin")}/tickets/${ticket._id}`,
          whitelabelId: ticket.whitelabelId,
        })
      );
      notifications.push(assignedNotif);
    }

    return Promise.all(notifications);
  }

  /**
   * Notify user about ticket response
   */
  async notifyTicketResponse(ticket, user) {
    const dashboardPath = getDashboardPath(user.role);

    return this.sendToUser(
      user._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.TICKET_RESPONSE,
        title: "Ticket Response",
        titleAr: "رد على التذكرة",
        message: "Your support ticket has received a response.",
        messageAr: "تم الرد على تذكرة الدعم الخاصة بك.",
        entityType: ENTITY_TYPES.TICKET,
        entityId: ticket._id,
        actionUrl: `${dashboardPath}/tickets/${ticket._id}`,
        whitelabelId: ticket.whitelabelId,
      })
    );
  }

  /**
   * Notify about ticket resolution/closure
   */
  async notifyTicketResolved(ticket, user, resolvedBy) {
    const notifications = [];
    const dashboardPath = getDashboardPath(user.role);

    // Notify the user who created the ticket
    const userNotif = this.sendToUser(
      user._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.TICKET_RESOLVED,
        title: "Ticket Resolved",
        titleAr: "تم حل التذكرة",
        message: "Your support ticket has been resolved and closed.",
        messageAr: "تم حل وإغلاق تذكرة الدعم الخاصة بك.",
        entityType: ENTITY_TYPES.TICKET,
        entityId: ticket._id,
        actionUrl: `${dashboardPath}/tickets/${ticket._id}`,
        whitelabelId: ticket.whitelabelId,
      })
    );
    notifications.push(userNotif);

    // Notify admins about ticket resolution for review
    const adminNotif = this.sendToAdmins(
      buildNotificationData({
        type: NOTIFICATION_TYPES.TICKET_RESOLVED,
        title: "Ticket Resolved",
        titleAr: "تم حل تذكرة",
        message: `Ticket #${ticket._id.toString().slice(-6)} has been resolved by ${resolvedBy?.username || "admin"}.`,
        messageAr: `تم حل التذكرة #${ticket._id.toString().slice(-6)} بواسطة ${resolvedBy?.username || "مدير"}.`,
        entityType: ENTITY_TYPES.TICKET,
        entityId: ticket._id,
        actionUrl: `${getDashboardPath("admin")}/tickets/${ticket._id}`,
        whitelabelId: ticket.whitelabelId,
      })
    );
    notifications.push(adminNotif);

    return Promise.all(notifications);
  }

  /**
   * Notify super admins about new registration (whitelabel or vendor)
   */
  async notifyNewRegistration(user, registrationType) {
    const isWhitelabel = registrationType === "whitelabel";
    const name = isWhitelabel
      ? user.profile?.whitelabelData?.arabicName ||
        user.profile?.whitelabelData?.englishName ||
        user.email
      : user.profile?.vendorData?.brandName || user.name || user.email;

    return this.sendToAdmins(
      buildNotificationData({
        type: NOTIFICATION_TYPES.USER_REGISTERED,
        title: isWhitelabel
          ? "New WhiteLabel Registration"
          : "New Vendor Registration",
        titleAr: isWhitelabel ? "تسجيل علامة بيضاء جديدة" : "تسجيل تاجر جديد",
        message: `New ${registrationType} registration: ${name}. Please review and approve.`,
        messageAr: `تسجيل ${isWhitelabel ? "علامة بيضاء" : "تاجر"} جديد: ${name}. يرجى المراجعة والموافقة.`,
        entityType: ENTITY_TYPES.USER,
        entityId: user._id,
        actionUrl: isWhitelabel
          ? `${getDashboardPath("admin")}/whitelabels/${user._id}`
          : `${getDashboardPath("admin")}/vendors/${user._id}`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
      })
    );
  }

  // ==========================================
  // VENDOR NOTIFICATIONS
  // ==========================================

  /**
   * Notify vendor about approval status change
   */
  async notifyVendorApprovalStatus(vendor, status) {
    const isApproved = status === "approved";

    return this.sendToUser(
      vendor._id,
      buildNotificationData({
        type: isApproved
          ? NOTIFICATION_TYPES.VENDOR_APPROVED
          : NOTIFICATION_TYPES.VENDOR_REJECTED,
        title: isApproved ? "Account Approved" : "Account Rejected",
        titleAr: isApproved ? "تمت الموافقة على الحساب" : "تم رفض الحساب",
        message: isApproved
          ? "Congratulations! Your vendor account has been approved. You can now list your services."
          : "Unfortunately, your vendor account application has been rejected. Please contact support.",
        messageAr: isApproved
          ? "تهانينا! تمت الموافقة على حساب التاجر الخاص بك. يمكنك الآن إضافة خدماتك."
          : "للأسف، تم رفض طلب حساب التاجر الخاص بك. يرجى التواصل مع الدعم.",
        entityType: ENTITY_TYPES.USER,
        entityId: vendor._id,
        actionUrl: isApproved
          ? `${getDashboardPath("vendor")}/services`
          : `${getDashboardPath("vendor")}/settings`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
      })
    );
  }

  /**
   * Notify vendor about service inquiry
   */
  async notifyServiceInquiry(service, vendor, inquiryData = {}) {
    return this.sendToUser(
      vendor._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.SERVICE_INQUIRY,
        title: "New Service Inquiry",
        titleAr: "استفسار جديد عن الخدمة",
        message: `Someone inquired about your service "${service.name}".`,
        messageAr: `شخص ما استفسر عن خدمتك "${service.name}".`,
        entityType: ENTITY_TYPES.SERVICE,
        entityId: service._id,
        metadata: inquiryData,
        actionUrl: `${getDashboardPath("vendor")}/services/${service._id}`,
      })
    );
  }

  /**
   * Notify vendor about views milestone
   */
  async notifyServiceViewsMilestone(service, vendor, milestone) {
    return this.sendToUser(
      vendor._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.SERVICE_VIEWS_MILESTONE,
        title: "Views Milestone Reached!",
        titleAr: "تم الوصول إلى عدد مشاهدات!",
        message: `Your service "${service.name}" has reached ${milestone} views!`,
        messageAr: `خدمتك "${service.name}" وصلت إلى ${milestone} مشاهدة!`,
        entityType: ENTITY_TYPES.SERVICE,
        entityId: service._id,
        metadata: { milestone },
        actionUrl: `${getDashboardPath("vendor")}/services/${service._id}`,
      })
    );
  }

  /**
   * Notify vendor about new review
   */
  async notifyNewReview(service, vendor, review) {
    return this.sendToUser(
      vendor._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.NEW_REVIEW,
        title: "New Review Received",
        titleAr: "تقييم جديد",
        message: `Your service "${service.name}" received a ${review.rating}-star review.`,
        messageAr: `خدمتك "${service.name}" حصلت على تقييم ${review.rating} نجوم.`,
        entityType: ENTITY_TYPES.SERVICE,
        entityId: service._id,
        metadata: { rating: review.rating, comment: review.comment },
        actionUrl: `${getDashboardPath("vendor")}/services/${service._id}`,
      })
    );
  }

  // ==========================================
  // USER NOTIFICATIONS
  // ==========================================

  /**
   * Send welcome notification to new user
   */
  async notifyWelcome(user) {
    const dashboardPath = getDashboardPath(user.role);

    return this.sendToUser(
      user._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.WELCOME,
        title: "Welcome to Halla!",
        titleAr: "مرحباً بك في هلا!",
        message: "Your account has been created successfully. Start exploring!",
        messageAr: "تم إنشاء حسابك بنجاح. ابدأ في الاستكشاف!",
        entityType: ENTITY_TYPES.USER,
        entityId: user._id,
        actionUrl: dashboardPath,
      })
    );
  }

  /**
   * Send profile incomplete reminder
   */
  async notifyProfileIncomplete(user, missingFields = []) {
    const dashboardPath = getDashboardPath(user.role);

    return this.sendToUser(
      user._id,
      buildNotificationData({
        type: NOTIFICATION_TYPES.PROFILE_INCOMPLETE,
        title: "Complete Your Profile",
        titleAr: "أكمل ملفك الشخصي",
        message: "Please complete your profile to get the most out of Halla.",
        messageAr: "يرجى إكمال ملفك الشخصي للاستفادة القصوى من هلا.",
        entityType: ENTITY_TYPES.USER,
        entityId: user._id,
        metadata: { missingFields },
        actionUrl: `${dashboardPath}/settings`,
      })
    );
  }

  // ==========================================
  // BROADCAST NOTIFICATIONS
  // ==========================================

  /**
   * Send announcement to all users or specific role
   */
  async sendAnnouncement(
    title,
    titleAr,
    message,
    messageAr,
    role = null,
    whitelabelId = null
  ) {
    const notificationData = buildNotificationData({
      type: NOTIFICATION_TYPES.ANNOUNCEMENT,
      title,
      titleAr,
      message,
      messageAr,
      whitelabelId,
    });

    if (role) {
      return this.sendToRole(role, notificationData, whitelabelId);
    }

    // Send to all active roles
    const roles = [
      "host",
      "vendor",
      "super_admin",
      "admin",
      "moderator",
      "whitelabel_admin",
      "whitelabel_moderator",
    ];
    const results = await Promise.all(
      roles.map((r) => this.sendToRole(r, notificationData, whitelabelId))
    );
    return results.flat();
  }

  /**
   * Send system alert to admins
   */
  async sendSystemAlert(
    title,
    message,
    priority = NOTIFICATION_PRIORITIES.HIGH
  ) {
    return this.sendToAdmins(
      buildNotificationData({
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        title,
        titleAr: title,
        message,
        messageAr: message,
        priority,
      })
    );
  }
}

// Export singleton instance
module.exports = new NotificationService();

// Also export class for testing
module.exports.NotificationService = NotificationService;

// Export helper functions
module.exports.buildNotificationData = buildNotificationData;
module.exports.getDashboardPath = getDashboardPath;

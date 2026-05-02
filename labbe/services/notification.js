/**
 * Notification Service
 * API service for notification management
 */

import apiClient from "./apiClient";

// ============================================
// ENDPOINTS
// ============================================

const ENDPOINTS = {
  BASE: "/notifications",
  UNREAD_COUNT: "/notifications/unread-count",
  READ_ALL: "/notifications/read-all",
  CLEAR_ALL: "/notifications/clear-all",
  SEND: "/notifications/send",
  BROADCAST: "/notifications/broadcast",
  ADMIN_ALL: "/notifications/admin/all",
  ADMIN_STATS: "/notifications/admin/stats",
};

// ============================================
// NOTIFICATION SERVICE
// ============================================

export const notificationService = {
  // ==========================================
  // USER ENDPOINTS
  // ==========================================

  /**
   * Get notifications with pagination and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @param {string} options.type - Filter by notification type
   * @param {boolean} options.isRead - Filter by read status
   * @param {string} options.priority - Filter by priority
   * @param {string} options.lang - Language for localized content (default: 'en')
   */
  getNotifications: async (options = {}) => {
    const queryString = apiClient.buildQueryString(options);
    return apiClient.get(`${ENDPOINTS.BASE}${queryString}`);
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async () => {
    return apiClient.get(ENDPOINTS.UNREAD_COUNT);
  },

  /**
   * Get single notification by ID
   * @param {string} id - Notification ID
   * @param {string} lang - Language for localized content
   */
  getNotification: async (id, lang = "en") => {
    return apiClient.get(`${ENDPOINTS.BASE}/${id}?lang=${lang}`);
  },

  /**
   * Mark single notification as read
   * @param {string} id - Notification ID
   */
  markAsRead: async (id) => {
    return apiClient.patch(`${ENDPOINTS.BASE}/${id}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    return apiClient.patch(ENDPOINTS.READ_ALL);
  },

  /**
   * Delete single notification
   * @param {string} id - Notification ID
   */
  deleteNotification: async (id) => {
    return apiClient.delete(`${ENDPOINTS.BASE}/${id}`);
  },

  /**
   * Clear all notifications
   */
  clearAllNotifications: async () => {
    return apiClient.delete(ENDPOINTS.CLEAR_ALL);
  },


  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  /**
   * Send notification to specific users (Admin only)
   * @param {Object} data - Notification data
   * @param {string[]} data.userIds - Array of user IDs
   * @param {string} data.title - Notification title
   * @param {string} data.titleAr - Notification title (Arabic)
   * @param {string} data.message - Notification message
   * @param {string} data.messageAr - Notification message (Arabic)
   * @param {string} data.type - Notification type
   * @param {string} data.priority - Priority level
   * @param {string} data.actionUrl - Action URL
   */
  sendNotification: async (data) => {
    return apiClient.post(ENDPOINTS.SEND, data);
  },

  /**
   * Broadcast notification to role or all users (Admin only)
   * @param {Object} data - Broadcast data
   * @param {string} data.role - Target role (optional, null for all)
   * @param {string} data.title - Notification title
   * @param {string} data.titleAr - Notification title (Arabic)
   * @param {string} data.message - Notification message
   * @param {string} data.messageAr - Notification message (Arabic)
   * @param {string} data.priority - Priority level
   * @param {string} data.actionUrl - Action URL
   * @param {string} data.whitelabelId - Whitelabel ID for scoped broadcasts
   */
  broadcastNotification: async (data) => {
    return apiClient.post(ENDPOINTS.BROADCAST, data);
  },
};

// ============================================
// HELPER UTILITIES
// ============================================

/**
 * Format notification time ago
 * @param {string|Date} date - Date to format
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
 */
export const getNotificationIcon = (type) => {
  const iconMap = {
    // Event
    event_created: "calendar-plus",
    event_reminder: "bell",
    event_status_change: "calendar-check",
    event_completed: "check-circle",
    event_cancelled: "calendar-x",

    // Guest
    guest_rsvp_accepted: "user-check",
    guest_rsvp_declined: "user-x",
    guest_rsvp_maybe: "user-question",
    guest_checked_in: "scan",
    invitations_sent: "send",

    // Subscription
    subscription_expiring: "clock",
    subscription_renewed: "refresh-cw",
    subscription_expired: "alert-circle",
    plan_limit_warning: "alert-triangle",
    payment_successful: "credit-card",
    payment_failed: "x-circle",

    // User
    user_registered: "user-plus",
    vendor_pending_approval: "user-clock",
    vendor_approved: "badge-check",
    vendor_rejected: "user-minus",
    whitelabel_registered: "building",
    profile_incomplete: "user-edit",
    welcome: "sparkles",

    // Support
    ticket_created: "ticket",
    ticket_assigned: "user-check",
    ticket_response: "message-circle",
    ticket_resolved: "check-square",

    // Admin
    system_alert: "alert-octagon",
    revenue_report: "bar-chart",
    usage_report: "activity",

    // Vendor
    service_inquiry: "help-circle",
    service_booking: "calendar",
    new_review: "star",
    service_views_milestone: "eye",

    // General
    announcement: "megaphone",
    custom: "bell",
  };

  return iconMap[type] || "bell";
};

/**
 * Get notification priority color
 * @param {string} priority - Priority level
 */
export const getPriorityColor = (priority) => {
  const colorMap = {
    low: "#6B7280",
    normal: "#3B82F6",
    high: "#F59E0B",
    urgent: "#EF4444",
  };

  return colorMap[priority] || colorMap.normal;
};

export default notificationService;

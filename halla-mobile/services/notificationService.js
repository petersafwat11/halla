import { API_BASE_URL, ENDPOINTS } from "../config/api";

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {string} token - Auth token from useAuthStore
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>}
 */
const authenticatedFetch = async (endpoint, token, options = {}) => {
  if (!token) {
    throw new Error("No authentication token found");
  }

  const url = `${API_BASE_URL}${ENDPOINTS.NOTIFICATIONS.BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
};

/**
 * Build query string from options object
 * @param {Object} options - Query options
 * @returns {string} Query string
 */
const buildQueryString = (options = {}) => {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

// ==================== NOTIFICATION APIs ====================

/**
 * Get notifications with pagination and filters
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.type - Filter by notification type
 * @param {boolean} options.isRead - Filter by read status
 * @param {string} options.priority - Filter by priority
 * @param {string} options.lang - Language for localized content (default: 'en')
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getNotifications = async (options = {}, token) => {
  try {
    console.log("[NOTIFICATION SERVICE] Fetching notifications:", options);

    const queryString = buildQueryString(options);
    const data = await authenticatedFetch(queryString, token);

    console.log("[NOTIFICATION SERVICE] Notifications received:", {
      count: data.data?.notifications?.length || 0,
      total: data.data?.total || 0,
    });

    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error fetching notifications:",
      error.message
    );
    throw error;
  }
};

/**
 * Get unread notification count
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getUnreadCount = async (token) => {
  try {
    console.log("[NOTIFICATION SERVICE] Fetching unread count...");

    const data = await authenticatedFetch("/unread-count", token);

    console.log("[NOTIFICATION SERVICE] Unread count:", data.data?.count || 0);

    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error fetching unread count:",
      error.message
    );
    throw error;
  }
};

/**
 * Get single notification by ID
 * @param {string} id - Notification ID
 * @param {string} lang - Language for localized content
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const getNotification = async (id, lang = "en", token) => {
  try {
    console.log("[NOTIFICATION SERVICE] Fetching notification:", id);

    const data = await authenticatedFetch(`/${id}?lang=${lang}`, token);

    console.log("[NOTIFICATION SERVICE] Notification received");

    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error fetching notification:",
      error.message
    );
    throw error;
  }
};

/**
 * Mark single notification as read
 * @param {string} id - Notification ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const markAsRead = async (id, token) => {
  try {
    console.log("[NOTIFICATION SERVICE] Marking notification as read:", id);

    const data = await authenticatedFetch(`/${id}/read`, token, {
      method: "PATCH",
    });

    console.log("[NOTIFICATION SERVICE] Notification marked as read");

    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error marking notification as read:",
      error.message
    );
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const markAllAsRead = async (token) => {
  try {
    console.log("[NOTIFICATION SERVICE] Marking all notifications as read...");

    const data = await authenticatedFetch("/read-all", token, {
      method: "PATCH",
    });

    console.log("[NOTIFICATION SERVICE] All notifications marked as read");

    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error marking all as read:",
      error.message
    );
    throw error;
  }
};

/**
 * Delete single notification
 * @param {string} id - Notification ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const deleteNotification = async (id, token) => {
  try {
    console.log("[NOTIFICATION SERVICE] Deleting notification:", id);

    const data = await authenticatedFetch(`/${id}`, token, {
      method: "DELETE",
    });

    console.log("[NOTIFICATION SERVICE] Notification deleted");

    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error deleting notification:",
      error.message
    );
    throw error;
  }
};

/**
 * Clear all notifications
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const clearAllNotifications = async (token) => {
  try {
    console.log("[NOTIFICATION SERVICE] Clearing all notifications...");

    const data = await authenticatedFetch("/clear-all", token, {
      method: "DELETE",
    });

    console.log("[NOTIFICATION SERVICE] All notifications cleared");

    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error clearing notifications:",
      error.message
    );
    throw error;
  }
};

// ==================== HELPER UTILITIES ====================

/**
 * Format notification time ago
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time ago string
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
 * @returns {string} Icon name
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
 * @returns {string} Color hex code
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

// ==================== ADMIN APIs ====================

/**
 * Send notification to specific users (Admin only)
 * @param {Object} data - { userIds, title, titleAr, message, messageAr, type }
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const sendNotification = async (data, token) => {
  try {
    const result = await authenticatedFetch("/send", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error sending notification:",
      error.message
    );
    throw error;
  }
};

/**
 * Broadcast notification to role or all users (Admin only)
 * @param {Object} data - { role, title, titleAr, message, messageAr, type, whitelabelId }
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const broadcastNotification = async (data, token) => {
  try {
    const result = await authenticatedFetch("/broadcast", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return result;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error broadcasting notification:",
      error.message
    );
    throw error;
  }
};

// Export all functions as default object for alternative import style
export default {
  getNotifications,
  getUnreadCount,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  sendNotification,
  broadcastNotification,
  formatTimeAgo,
  getNotificationIcon,
  getPriorityColor,
};

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";
import { dlog } from "../utils/log";

/**
 * Phase 8: the `_legacyToken` second-arg compat shim is gone. Every
 * call goes through `apiFetch`, which reads the in-memory access token
 * from `useAuthStore` directly and auto-refreshes on 401. Chatty info
 * logs swapped from `console.log` to `dlog(...)` so release bundles
 * stop emitting them.
 *
 * @param {string} endpoint - relative path under NOTIFICATIONS.BASE
 * @param {Object} [options] - fetch options (method/body/headers)
 */
const authenticatedFetch = async (endpoint, options = {}) => {
  const path = `${ENDPOINTS.NOTIFICATIONS.BASE}${endpoint}`;
  const fetchOpts = {
    method: options.method || "GET",
    headers: options.headers || {},
  };
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "string") {
      try {
        fetchOpts.body = JSON.parse(options.body);
      } catch (_) {
        fetchOpts.body = options.body;
      }
    } else {
      fetchOpts.body = options.body;
    }
  }
  const response = await apiFetch(path, fetchOpts);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }
  return data;
};

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

export const getNotifications = async (options = {}) => {
  try {
    dlog("[NOTIFICATION SERVICE] Fetching notifications:", options);
    const queryString = buildQueryString(options);
    const data = await authenticatedFetch(queryString);
    dlog("[NOTIFICATION SERVICE] Notifications received:", {
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

export const getUnreadCount = async () => {
  try {
    dlog("[NOTIFICATION SERVICE] Fetching unread count...");
    const data = await authenticatedFetch("/unread-count");
    dlog("[NOTIFICATION SERVICE] Unread count:", data.data?.count || 0);
    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error fetching unread count:",
      error.message
    );
    throw error;
  }
};

export const getNotification = async (id, lang = "en") => {
  try {
    dlog("[NOTIFICATION SERVICE] Fetching notification:", id);
    const data = await authenticatedFetch(`/${id}?lang=${lang}`);
    dlog("[NOTIFICATION SERVICE] Notification received");
    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error fetching notification:",
      error.message
    );
    throw error;
  }
};

export const markAsRead = async (id) => {
  try {
    dlog("[NOTIFICATION SERVICE] Marking notification as read:", id);
    const data = await authenticatedFetch(`/${id}/read`, { method: "PATCH" });
    dlog("[NOTIFICATION SERVICE] Notification marked as read");
    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error marking notification as read:",
      error.message
    );
    throw error;
  }
};

export const markAllAsRead = async () => {
  try {
    dlog("[NOTIFICATION SERVICE] Marking all notifications as read...");
    const data = await authenticatedFetch("/read-all", { method: "PATCH" });
    dlog("[NOTIFICATION SERVICE] All notifications marked as read");
    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error marking all as read:",
      error.message
    );
    throw error;
  }
};

export const deleteNotification = async (id) => {
  try {
    dlog("[NOTIFICATION SERVICE] Deleting notification:", id);
    const data = await authenticatedFetch(`/${id}`, { method: "DELETE" });
    dlog("[NOTIFICATION SERVICE] Notification deleted");
    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error deleting notification:",
      error.message
    );
    throw error;
  }
};

export const clearAllNotifications = async () => {
  try {
    dlog("[NOTIFICATION SERVICE] Clearing all notifications...");
    const data = await authenticatedFetch("/clear-all", { method: "DELETE" });
    dlog("[NOTIFICATION SERVICE] All notifications cleared");
    return data;
  } catch (error) {
    console.error(
      "[NOTIFICATION SERVICE] Error clearing notifications:",
      error.message
    );
    throw error;
  }
};

// Phase 8 — presentation helpers (formatTimeAgo, getNotificationIcon,
// getPriorityColor) relocated to `@halla/shared/utils/notification`.
// Re-exported here so existing consumers (NotificationItem.js, the
// ticket card on admin) keep working.
export {
  formatTimeAgo,
  getNotificationIcon,
  getPriorityColor,
} from "@halla/shared/utils/notification";

// ==================== ADMIN APIs ====================

export const sendNotification = async (data) => {
  try {
    const result = await authenticatedFetch("/send", {
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

export const broadcastNotification = async (data) => {
  try {
    const result = await authenticatedFetch("/broadcast", {
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
};

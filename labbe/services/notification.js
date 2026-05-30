/**
 * Notification Service
 * API service for notification management.
 *
 * Phase 8: retired the `legacyClientAdapter` `.get/.post/.patch/.delete`
 * façade; every call now goes through `apiRequest` directly. Query
 * strings are passed via the axios `params` config so the URL stays
 * canonical.
 */

import { apiRequest } from "./http";

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

export const notificationService = {
  // ==========================================
  // USER ENDPOINTS
  // ==========================================

  getNotifications: async (options = {}) =>
    apiRequest({
      method: "GET",
      path: ENDPOINTS.BASE,
      params: options,
    }),

  getUnreadCount: async () =>
    apiRequest({ method: "GET", path: ENDPOINTS.UNREAD_COUNT }),

  getNotification: async (id, lang = "en") =>
    apiRequest({
      method: "GET",
      path: `${ENDPOINTS.BASE}/${id}`,
      params: { lang },
    }),

  markAsRead: async (id) =>
    apiRequest({ method: "PATCH", path: `${ENDPOINTS.BASE}/${id}/read` }),

  markAllAsRead: async () =>
    apiRequest({ method: "PATCH", path: ENDPOINTS.READ_ALL }),

  deleteNotification: async (id) =>
    apiRequest({ method: "DELETE", path: `${ENDPOINTS.BASE}/${id}` }),

  clearAllNotifications: async () =>
    apiRequest({ method: "DELETE", path: ENDPOINTS.CLEAR_ALL }),

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  sendNotification: async (data) =>
    apiRequest({ method: "POST", path: ENDPOINTS.SEND, data }),

  broadcastNotification: async (data) =>
    apiRequest({ method: "POST", path: ENDPOINTS.BROADCAST, data }),
};

// Phase 8 — presentation helpers (formatTimeAgo, getNotificationIcon,
// getPriorityColor) relocated to `@halla/shared/utils/notification`.
// Re-exported here so existing consumers keep working.
export {
  formatTimeAgo,
  getNotificationIcon,
  getPriorityColor,
} from "@halla/shared/utils/notification";

export default notificationService;

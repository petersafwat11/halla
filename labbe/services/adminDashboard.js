/**
 * Admin Dashboard Service
 * Centralized API service for admin dashboard operations.
 *
 * Phase 8: retired the `legacyClientAdapter` `.get/.post/.patch/.delete`
 * façade; every call now goes through `apiRequest` directly. The
 * vestigial `token = null` parameter every function carried is gone —
 * auth flows through the HttpOnly access_token cookie attached by the
 * axios `withCredentials: true` config in `services/http.js`.
 */

import { apiRequest } from "./http";

/**
 * Helper to trigger file download from blob
 */
const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return { success: true };
};

/**
 * Dashboard Statistics API
 */
export const dashboardAPI = {
  getStats: async (period = "month", filters = {}) =>
    apiRequest({
      method: "GET",
      path: "/dashboard/admin",
      params: { period, ...filters },
    }),
  getUserGrowth: async (period = "month", granularity = "day") =>
    apiRequest({
      method: "GET",
      path: "/dashboard/admin/users/growth",
      params: { period, granularity },
    }),
  getRevenue: async (period = "month", granularity = "day") =>
    apiRequest({
      method: "GET",
      path: "/dashboard/admin/revenue",
      params: { period, granularity },
    }),
  getEventStats: async (period = "month") =>
    apiRequest({
      method: "GET",
      path: "/dashboard/admin/events",
      params: { period },
    }),
  getSubscriptionStats: async () =>
    apiRequest({ method: "GET", path: "/dashboard/admin/subscriptions" }),
};

/**
 * Hosts Management API (Extended with subscription management)
 */
export const hostsAPI = {
  getAll: async (filters = {}) =>
    apiRequest({ method: "GET", path: "/admin/hosts", params: filters }),

  getById: async (hostId) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiRequest({ method: "GET", path: `/admin/hosts/${hostId}` });
  },

  create: async (hostData) =>
    apiRequest({ method: "POST", path: "/admin/hosts", data: hostData }),

  updateStatus: async (hostId, status) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/hosts/${hostId}/status`,
      data: { status },
    });
  },

  updateSubscription: async (hostId, planCode, billingCycle = null) => {
    if (!hostId) throw new Error("Host ID is required");
    const body = { planCode };
    if (billingCycle) body.billingCycle = billingCycle;
    return apiRequest({
      method: "PATCH",
      path: `/admin/hosts/${hostId}/subscription`,
      data: body,
    });
  },

  delete: async (hostId) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiRequest({ method: "DELETE", path: `/admin/hosts/${hostId}` });
  },

  bulkDelete: async (hostIds) => {
    if (!hostIds || hostIds.length === 0) throw new Error("Host IDs are required");
    if (hostIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = hostIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiRequest({
      method: "POST",
      path: "/admin/hosts/bulk-delete",
      data: { hostIds },
    });
  },

  export: async (filters = {}) => {
    const blob = await apiRequest({
      method: "GET",
      path: "/admin/hosts/export",
      params: filters,
    });
    return downloadBlob(
      blob,
      `hosts_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },

  verifyByPhone: async (phoneNumber) => {
    if (!phoneNumber) throw new Error("Phone number is required");
    return apiRequest({
      method: "GET",
      path: "/admin/hosts/verify-phone",
      params: { phoneNumber },
    });
  },

  sendNotification: async (hostId, notificationData) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiRequest({
      method: "POST",
      path: "/notifications/send",
      data: { userIds: [hostId], ...notificationData },
    });
  },

  notifyAll: async (notificationData) =>
    apiRequest({
      method: "POST",
      path: "/notifications/broadcast",
      data: { role: "host", ...notificationData },
    }),

  /**
   * Find or create a host by phone number.
   * Used when creating events for hosts that may not exist yet.
   */
  findOrCreate: async (hostData) =>
    apiRequest({
      method: "POST",
      path: "/admin/hosts/find-or-create",
      data: hostData,
    }),

  /**
   * Get event targets (hosts and whitelabels) for admin event creation.
   */
  getEventTargets: async (filters = {}) =>
    apiRequest({
      method: "GET",
      path: "/admin/event-targets",
      params: filters,
    }),

  /**
   * Get subscription info for a specific user (for event creation validation).
   */
  getUserSubscriptionInfo: async (userId) => {
    if (!userId) throw new Error("User ID is required");
    return apiRequest({
      method: "GET",
      path: `/admin/users/${userId}/subscription-info`,
    });
  },
};

/**
 * Moderators/Admins Management API
 */
export const moderatorsAPI = {
  getAll: async (filters = {}) =>
    apiRequest({ method: "GET", path: "/admin/moderators", params: filters }),

  create: async (adminData) =>
    apiRequest({ method: "POST", path: "/admin/moderators", data: adminData }),

  update: async (adminId, adminData) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/moderators/${adminId}`,
      data: adminData,
    });
  },

  delete: async (adminId) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiRequest({
      method: "DELETE",
      path: `/admin/moderators/${adminId}`,
    });
  },

  bulkDelete: async (adminIds) => {
    if (!adminIds || adminIds.length === 0)
      throw new Error("Admin IDs are required");
    if (adminIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = adminIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiRequest({
      method: "POST",
      path: "/admin/moderators/bulk-delete",
      data: { moderatorIds: adminIds },
    });
  },

  export: async (filters = {}) => {
    const blob = await apiRequest({
      method: "GET",
      path: "/admin/moderators/export",
      params: filters,
    });
    return downloadBlob(
      blob,
      `moderators_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },

  updateStatus: async (adminId, status) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/moderators/${adminId}/status`,
      data: { status },
    });
  },

  sendNotification: async (adminId, notificationData) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiRequest({
      method: "POST",
      path: "/notifications/send",
      data: { userIds: [adminId], ...notificationData },
    });
  },

  notifyAll: async (notificationData) =>
    apiRequest({
      method: "POST",
      path: "/notifications/broadcast",
      data: { role: "moderator", ...notificationData },
    }),
};

/**
 * Whitelabel Management API
 */
export const whitelabelAPI = {
  getAll: async (filters = {}) =>
    apiRequest({ method: "GET", path: "/admin/whitelabels", params: filters }),

  getById: async (whitelabelId) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiRequest({
      method: "GET",
      path: `/admin/whitelabels/${whitelabelId}`,
    });
  },

  create: async (data) =>
    apiRequest({ method: "POST", path: "/admin/whitelabels", data }),

  update: async (whitelabelId, data) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/whitelabels/${whitelabelId}`,
      data,
    });
  },

  updateStatus: async (whitelabelId, status) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/whitelabels/${whitelabelId}/status`,
      data: { status },
    });
  },

  delete: async (whitelabelId) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiRequest({
      method: "DELETE",
      path: `/admin/whitelabels/${whitelabelId}`,
    });
  },

  bulkDelete: async (whitelabelIds) => {
    if (!whitelabelIds || whitelabelIds.length === 0)
      throw new Error("Whitelabel IDs are required");
    if (whitelabelIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = whitelabelIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiRequest({
      method: "POST",
      path: "/admin/whitelabels/bulk-delete",
      data: { whitelabelIds },
    });
  },

  updateSubscription: async (whitelabelId, subscriptionData) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/whitelabels/${whitelabelId}/subscription`,
      data: subscriptionData,
    });
  },

  /**
   * Update whitelabel settings (branding, etc.).
   * Supports both JSON data and FormData for file uploads.
   */
  updateSettings: async (data) => {
    const isFormData = data instanceof FormData;
    return apiRequest({
      method: "PATCH",
      path: "/whitelabel/settings",
      data,
      config: isFormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {},
    });
  },

  getSettings: async () =>
    apiRequest({ method: "GET", path: "/whitelabel/settings" }),

  sendNotification: async (whitelabelId, notificationData) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiRequest({
      method: "POST",
      path: "/notifications/send",
      data: { userIds: [whitelabelId], ...notificationData },
    });
  },

  notifyAll: async (notificationData) =>
    apiRequest({
      method: "POST",
      path: "/notifications/broadcast",
      data: { role: "whitelabel_admin", ...notificationData },
    }),

  export: async (filters = {}) => {
    const blob = await apiRequest({
      method: "GET",
      path: "/admin/whitelabels/export",
      params: filters,
    });
    return downloadBlob(
      blob,
      `whitelabels_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },
};

/**
 * Vendors Management API
 */
export const vendorsAPI = {
  getAll: async (filters = {}) =>
    apiRequest({ method: "GET", path: "/admin/vendors", params: filters }),

  getById: async (vendorId) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiRequest({ method: "GET", path: `/admin/vendors/${vendorId}` });
  },

  updateStatus: async (vendorId, status) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/vendors/${vendorId}/status`,
      data: { status },
    });
  },

  approve: async (vendorId) => vendorsAPI.updateStatus(vendorId, "approved"),

  giveRating: async (vendorId, rating) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/vendors/${vendorId}/rating`,
      data: { rating },
    });
  },

  delete: async (vendorId) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiRequest({ method: "DELETE", path: `/admin/vendors/${vendorId}` });
  },

  bulkDelete: async (vendorIds) => {
    if (!vendorIds || vendorIds.length === 0)
      throw new Error("Vendor IDs are required");
    if (vendorIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = vendorIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiRequest({
      method: "POST",
      path: "/admin/vendors/bulk-delete",
      data: { vendorIds },
    });
  },

  bulkApprove: async (vendorIds) =>
    vendorsAPI.bulkUpdateStatus(vendorIds, "approved"),

  bulkSuspend: async (vendorIds) =>
    vendorsAPI.bulkUpdateStatus(vendorIds, "suspended"),

  bulkUpdateStatus: async (vendorIds, status) => {
    if (!vendorIds || vendorIds.length === 0)
      throw new Error("Vendor IDs are required");
    if (vendorIds.length > 100)
      throw new Error("Cannot update more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = vendorIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiRequest({
      method: "POST",
      path: "/admin/vendors/bulk-status",
      data: { vendorIds, status },
    });
  },

  export: async (filters = {}) => {
    const blob = await apiRequest({
      method: "GET",
      path: "/admin/vendors/export",
      params: filters,
    });
    return downloadBlob(
      blob,
      `vendors_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },

  sendNotification: async (vendorId, notificationData) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiRequest({
      method: "POST",
      path: "/notifications/send",
      data: { userIds: [vendorId], ...notificationData },
    });
  },

  notifyAll: async (notificationData) =>
    apiRequest({
      method: "POST",
      path: "/notifications/broadcast",
      data: { role: "vendor", ...notificationData },
    }),
};

/**
 * Events Management API
 */
export const eventsAPI = {
  getAll: async (filters = {}) =>
    apiRequest({ method: "GET", path: "/admin/events", params: filters }),

  getById: async (eventId) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiRequest({ method: "GET", path: `/admin/events/${eventId}` });
  },

  updateStatus: async (eventId, status) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/events/${eventId}/status`,
      data: { status },
    });
  },

  delete: async (eventId) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiRequest({ method: "DELETE", path: `/events/admin/${eventId}` });
  },

  bulkDelete: async (eventIds) => {
    if (!eventIds || eventIds.length === 0)
      throw new Error("Event IDs are required");
    if (eventIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = eventIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiRequest({
      method: "POST",
      path: "/admin/events/bulk-delete",
      data: { eventIds },
    });
  },

  createForHost: async (formData) =>
    apiRequest({
      method: "POST",
      path: "/admin/events/create-for-host",
      data: formData,
    }),

  /**
   * Update event (admin).
   */
  updateEvent: async (eventId, eventData) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/events/${eventId}`,
      data: eventData,
    });
  },

  /**
   * Get event stats (admin) - includes RSVP stats, guests, subscription info.
   */
  getEventStats: async (eventId) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiRequest({
      method: "GET",
      path: `/admin/events/${eventId}/stats`,
    });
  },

  /**
   * Send test message for event (admin).
   */
  sendTestMessage: async (eventId, phoneNumber, channel = "whatsapp") => {
    if (!eventId) throw new Error("Event ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/events/${eventId}/test-message`,
      data: { phoneNumber, channel },
    });
  },

  /**
   * Update event launch settings (admin).
   */
  updateLaunchSettings: async (eventId, launchSettings) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiRequest({
      method: "PATCH",
      path: `/admin/events/${eventId}/launch-settings`,
      data: launchSettings,
    });
  },

  export: async (filters = {}) => {
    const blob = await apiRequest({
      method: "GET",
      path: "/admin/events/export",
      params: filters,
    });
    return downloadBlob(
      blob,
      `events_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },
};

/**
 * SUPER_ADMIN can assign a subscription to a host directly (e.g. comp /
 * migration). Audit log is wired server-side.
 */
export const subscriptionAdminAPI = {
  assign: async (data) => {
    if (!data?.userId || !data?.planCode)
      throw new Error("userId and planCode are required");
    return apiRequest({
      method: "POST",
      path: "/subscriptions/admin/assign",
      data,
    });
  },
};

/**
 * Legacy addons API surface. New code should use the `useAddons` and
 * `useCheckout` hooks from `hooks/addons/` and `hooks/checkout/`. This
 * export remains for the admin dashboard's bulk operations.
 */
export const addonsAPI = {
  purchase: async (data, idempotencyKey = null) =>
    apiRequest({
      method: "POST",
      path: "/addons/purchase",
      data,
      config: idempotencyKey
        ? { headers: { "Idempotency-Key": idempotencyKey } }
        : {},
    }),

  adminActivate: async (addonId, data, idempotencyKey = null) => {
    if (!addonId) throw new Error("addonId is required");
    return apiRequest({
      method: "POST",
      path: `/addons/admin/${addonId}/activate`,
      data,
      config: idempotencyKey
        ? { headers: { "Idempotency-Key": idempotencyKey } }
        : {},
    });
  },

  listMine: async (params = {}) =>
    apiRequest({ method: "GET", path: "/addons", params }),
};

/**
 * Combined Admin Dashboard API
 */
const adminDashboardAPI = {
  dashboard: dashboardAPI,
  hosts: hostsAPI,
  moderators: moderatorsAPI,
  whitelabel: whitelabelAPI,
  whitelabels: whitelabelAPI, // Alias for backward compatibility
  vendors: vendorsAPI,
  events: eventsAPI,
};

// Alias for backward compatibility with old lib/admin.js imports.
// Provides adminAPI.hosts.* pattern used by admin components.
export const adminAPI = {
  hosts: hostsAPI,
  moderators: moderatorsAPI,
};

export default adminDashboardAPI;

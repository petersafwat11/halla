/**
 * Admin Dashboard Service
 * Provides API integration for admin dashboard functionality
 * Base URL: https://labbe-backend-production.up.railway.app/api
 */

import { Linking } from "react-native";

const BASE_URL = "https://labbe-backend-production.up.railway.app/api";

/**
 * Helper function to make API requests
 */
const apiRequest = async (endpoint, method = "GET", token, data = null) => {
  try {
    const isFormData = data instanceof FormData;
    const config = {
      method,
      headers: isFormData
        ? { Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      config.body = isFormData ? data : JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: responseData.message || `HTTP error! status: ${response.status}`,
      };
    }

    return { success: true, data: responseData, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message || "An unexpected error occurred",
    };
  }
};

/**
 * Opens an export/download URL in the device browser.
 * Auth token is passed as a query param since Linking.openURL can't set headers.
 */
const openExportUrl = async (path, token, filters = {}) => {
  const clean = Object.fromEntries(
    Object.entries({ token, ...filters }).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const params = new URLSearchParams(clean);
  const url = `${BASE_URL}${path}?${params.toString()}`;
  await Linking.openURL(url);
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboard = {
  getStats: async (token, period = 'month') => {
    const qs = period ? `?period=${period}` : '';
    return apiRequest(`/dashboard/admin${qs}`, "GET", token);
  },
};

// ─── Hosts ────────────────────────────────────────────────────────────────────
export const hosts = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/hosts${qs ? `?${qs}` : ""}`, "GET", token);
  },

  getById: async (token, hostId) =>
    apiRequest(`/admin/hosts/${hostId}`, "GET", token),

  create: async (token, hostData) =>
    apiRequest("/admin/hosts", "POST", token, hostData),

  updateStatus: async (token, hostId, status) =>
    apiRequest(`/admin/hosts/${hostId}/status`, "PATCH", token, { status }),

  updateSubscription: async (token, hostId, subscriptionData) =>
    apiRequest(`/admin/hosts/${hostId}/subscription`, "PATCH", token, subscriptionData),

  delete: async (token, hostId) =>
    apiRequest(`/admin/hosts/${hostId}`, "DELETE", token),

  bulkDelete: async (token, hostIds) =>
    apiRequest("/admin/hosts/bulk-delete", "POST", token, { hostIds }),

  export: async (token, filters = {}) =>
    openExportUrl("/admin/hosts/export", token, filters),

  sendNotification: async (token, hostId, notificationData) =>
    apiRequest("/notifications/send", "POST", token, { userIds: [hostId], ...notificationData }),

  getEventTargets: async (token, type) => {
    const endpoint = `/admin/event-targets${type ? `?type=${type}` : ""}`;
    return apiRequest(endpoint, "GET", token);
  },

  verifyHostPhone: async (token, phoneNumber) =>
    apiRequest(`/admin/hosts/verify-phone?phoneNumber=${encodeURIComponent(phoneNumber)}`, "GET", token),
};

// ─── Moderators ───────────────────────────────────────────────────────────────
export const moderators = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/moderators${qs ? `?${qs}` : ""}`, "GET", token);
  },

  create: async (token, moderatorData) =>
    apiRequest("/admin/moderators", "POST", token, moderatorData),

  update: async (token, moderatorId, moderatorData) =>
    apiRequest(`/admin/moderators/${moderatorId}`, "PATCH", token, moderatorData),

  delete: async (token, moderatorId) =>
    apiRequest(`/admin/moderators/${moderatorId}`, "DELETE", token),

  updateStatus: async (token, moderatorId, status) =>
    apiRequest(`/admin/moderators/${moderatorId}/status`, "PATCH", token, { status }),

  bulkDelete: async (token, moderatorIds) =>
    apiRequest("/admin/moderators/bulk-delete", "POST", token, { moderatorIds }),

  bulkSuspend: async (token, moderatorIds) =>
    apiRequest("/admin/moderators/bulk-status", "POST", token, { moderatorIds, status: "inactive" }),

  export: async (token, filters = {}) =>
    openExportUrl("/admin/moderators/export", token, filters),
};

// ─── Vendors ──────────────────────────────────────────────────────────────────
export const vendors = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/vendors${qs ? `?${qs}` : ""}`, "GET", token);
  },

  getById: async (token, vendorId) =>
    apiRequest(`/admin/vendors/${vendorId}`, "GET", token),

  updateStatus: async (token, vendorId, status) =>
    apiRequest(`/admin/vendors/${vendorId}/status`, "PATCH", token, { status }),

  approve: async (token, vendorId) =>
    apiRequest(`/admin/vendors/${vendorId}/status`, "PATCH", token, { status: "approved" }),

  giveRating: async (token, vendorId, ratingData) =>
    apiRequest(`/admin/vendors/${vendorId}/rating`, "PATCH", token, ratingData),

  delete: async (token, vendorId) =>
    apiRequest(`/admin/vendors/${vendorId}`, "DELETE", token),

  bulkDelete: async (token, vendorIds) =>
    apiRequest("/admin/vendors/bulk-delete", "POST", token, { vendorIds }),

  bulkApprove: async (token, vendorIds) =>
    apiRequest("/admin/vendors/bulk-status", "POST", token, { vendorIds, status: "approved" }),

  bulkSuspend: async (token, vendorIds) =>
    apiRequest("/admin/vendors/bulk-status", "POST", token, { vendorIds, status: "suspended" }),

  export: async (token, filters = {}) =>
    openExportUrl("/admin/vendors/export", token, filters),
};

// ─── Events ───────────────────────────────────────────────────────────────────
export const events = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/events/admin/all${qs ? `?${qs}` : ""}`, "GET", token);
  },

  getById: async (token, eventId) =>
    apiRequest(`/admin/events/${eventId}`, "GET", token),

  createForHost: async (token, eventData) =>
    apiRequest("/admin/events/create-for-host", "POST", token, eventData),

  updateStatus: async (token, eventId, status) =>
    apiRequest(`/admin/events/${eventId}/status`, "PATCH", token, { status }),

  update: async (token, eventId, eventData) =>
    apiRequest(`/admin/events/${eventId}`, "PATCH", token, eventData),

  delete: async (token, eventId) =>
    apiRequest(`/admin/events/${eventId}`, "DELETE", token),

  bulkDelete: async (token, eventIds) =>
    apiRequest("/admin/events/bulk-delete", "POST", token, { eventIds }),

  bulkSuspend: async (token, eventIds) =>
    apiRequest("/admin/events/bulk-status", "POST", token, { eventIds, status: "suspended" }),

  export: async (token, filters = {}) =>
    openExportUrl("/admin/events/export", token, filters),
};

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const tickets = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/tickets${qs ? `?${qs}` : ""}`, "GET", token);
  },

  getById: async (token, ticketId) =>
    apiRequest(`/tickets/${ticketId}`, "GET", token),

  assignTo: async (token, ticketId, assigneeId) =>
    apiRequest(`/tickets/${ticketId}/assign`, "PATCH", token, { assigneeId }),

  resolve: async (token, ticketId, resolution) =>
    apiRequest(`/tickets/${ticketId}/status`, "PATCH", token, { status: "resolved", resolution }),

  reopen: async (token, ticketId) =>
    apiRequest(`/tickets/${ticketId}/status`, "PATCH", token, { status: "open" }),

  respond: async (token, ticketId, message) =>
    apiRequest(`/tickets/${ticketId}`, "PATCH", token, { message }),

  delete: async (token, ticketId) =>
    apiRequest(`/tickets/${ticketId}`, "DELETE", token),

  export: async (token, filters = {}) =>
    openExportUrl("/tickets/export", token, filters),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/payments${qs ? `?${qs}` : ""}`, "GET", token);
  },

  getById: async (token, paymentId) =>
    apiRequest(`/admin/payments/${paymentId}`, "GET", token),

  getSummary: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/payments/summary${qs ? `?${qs}` : ""}`, "GET", token);
  },

  export: async (token, filters = {}) =>
    openExportUrl("/admin/payments/export", token, filters),
};

// ─── Plans ────────────────────────────────────────────────────────────────────
export const plans = {
  getAll: async (token) => apiRequest("/plans", "GET", token),
  getHostPlans: async (token) => apiRequest("/plans/host", "GET", token),
  getEnterprisePlans: async (token) => apiRequest("/plans/enterprise", "GET", token),
  getAllForAdmin: async (token) => apiRequest("/plans/admin/all", "GET", token),
  updatePlan: async (token, code, data) => apiRequest(`/plans/admin/${code}`, "PATCH", token, data),
};

// ─── Whitelabels ──────────────────────────────────────────────────────────────
export const whitelabels = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/whitelabels${qs ? `?${qs}` : ""}`, "GET", token);
  },

  getById: async (token, whitelabelId) =>
    apiRequest(`/admin/whitelabels/${whitelabelId}`, "GET", token),

  updateStatus: async (token, whitelabelId, status) =>
    apiRequest(`/admin/whitelabels/${whitelabelId}/status`, "PATCH", token, { status }),

  updateSubscription: async (token, whitelabelId, subscriptionData) =>
    apiRequest(`/admin/whitelabels/${whitelabelId}/subscription`, "PATCH", token, subscriptionData),

  delete: async (token, whitelabelId) =>
    apiRequest(`/admin/whitelabels/${whitelabelId}`, "DELETE", token),

  bulkDelete: async (token, whitelabelIds) =>
    apiRequest("/admin/whitelabels/bulk-delete", "POST", token, { whitelabelIds }),

  bulkSuspend: async (token, whitelabelIds) =>
    apiRequest("/admin/whitelabels/bulk-status", "POST", token, { whitelabelIds, status: "suspended" }),

  export: async (token, filters = {}) =>
    openExportUrl("/admin/whitelabels/export", token, filters),
};

// ─── Discounts ────────────────────────────────────────────────────────────────
export const discounts = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/discounts/admin${qs ? `?${qs}` : ""}`, "GET", token);
  },

  create: async (token, data) =>
    apiRequest("/discounts/admin", "POST", token, data),

  update: async (token, id, data) =>
    apiRequest(`/discounts/admin/${id}`, "PATCH", token, data),

  delete: async (token, id) =>
    apiRequest(`/discounts/admin/${id}`, "DELETE", token),

  toggleStatus: async (token, id) =>
    apiRequest(`/discounts/admin/${id}/toggle`, "PATCH", token),

  validate: async (token, data) =>
    apiRequest("/discounts/validate", "POST", token, data),
};

export default {
  dashboard,
  hosts,
  moderators,
  vendors,
  events,
  tickets,
  payments,
  plans,
  whitelabels,
  discounts,
};

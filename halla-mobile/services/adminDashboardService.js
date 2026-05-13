/**
 * Admin service: hosts, vendors, moderators, events, tickets, payments,
 * plans, whitelabels, discounts. Token args are accepted but ignored —
 * apiFetch reads the in-memory access token directly.
 */

import { Linking } from "react-native";
import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";
import { useAuthStore } from "../stores/authStore";
import {
  getTicketsAPI as ticketsGetAll,
  getTicketAPI as ticketsGetById,
  assignTicketAPI as ticketsAssign,
  updateTicketStatusAPI as ticketsUpdateStatus,
  updateTicketAPI as ticketsUpdate,
  deleteTicketAPI as ticketsDelete,
  exportTicketsAPI as ticketsExport,
} from "./ticketsService";

const _envelope = async (promise) => {
  try {
    return { success: true, data: await promise, error: null };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err?.message || "An unexpected error occurred",
    };
  }
};

const BASE_URL = API_BASE_URL;

/**
 * Helper function to make API requests through `apiFetch`.
 * Preserves the legacy `{ success, data, error }` envelope so callers
 * don't need to change.
 */
const apiRequest = async (endpoint, method = "GET", data = null, extraHeaders = null) => {
  try {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const init = {
      method,
      headers: extraHeaders || undefined,
    };
    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      init.body = data;
    }
    if (isFormData) {
      init.timeoutMs = 60 * 1000;
    }

    const response = await apiFetch(endpoint, init);
    const responseData = await response.json().catch(() => ({}));

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
 * Auth token is read from the in-memory store and passed as a query param
 * since Linking.openURL can't set headers.
 */
const openExportUrl = async (path, filters = {}) => {
  const token = useAuthStore.getState().token;
  const clean = Object.fromEntries(
    Object.entries({ token, ...filters }).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  const params = new URLSearchParams(clean);
  const url = `${BASE_URL}${path}?${params.toString()}`;
  await Linking.openURL(url);
};

export const hosts = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.ADMIN.HOSTS.BASE}${qs ? `?${qs}` : ""}`);
  },

  getById: async (token, hostId) =>
    apiRequest(ENDPOINTS.ADMIN.HOSTS.BY_ID(hostId)),

  create: async (token, hostData) =>
    apiRequest(ENDPOINTS.ADMIN.HOSTS.BASE, "POST", hostData),

  updateStatus: async (token, hostId, status) =>
    apiRequest(ENDPOINTS.ADMIN.HOSTS.STATUS(hostId), "PATCH", { status }),

  updateSubscription: async (token, hostId, subscriptionData) =>
    apiRequest(ENDPOINTS.ADMIN.HOSTS.SUBSCRIPTION(hostId), "PATCH", subscriptionData),

  delete: async (token, hostId) =>
    apiRequest(ENDPOINTS.ADMIN.HOSTS.BY_ID(hostId), "DELETE"),

  bulkDelete: async (token, hostIds) =>
    apiRequest(ENDPOINTS.ADMIN.HOSTS.BULK_DELETE, "POST", { ids: hostIds }),

  export: async (token, filters = {}) =>
    openExportUrl(ENDPOINTS.ADMIN.HOSTS.EXPORT, filters),

  sendNotification: async (token, hostId, notificationData) =>
    apiRequest(ENDPOINTS.NOTIFICATIONS.SEND, "POST", { userIds: [hostId], ...notificationData }),

  getEventTargets: async (token, type) => {
    const endpoint = `${ENDPOINTS.ADMIN.EVENT_TARGETS}${type ? `?type=${type}` : ""}`;
    return apiRequest(endpoint);
  },

  verifyHostPhone: async (token, phoneNumber) =>
    apiRequest(`${ENDPOINTS.ADMIN.HOSTS.VERIFY_PHONE}?phoneNumber=${encodeURIComponent(phoneNumber)}`),
};

export const moderators = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.ADMIN.MODERATORS.BASE}${qs ? `?${qs}` : ""}`);
  },

  create: async (token, moderatorData) =>
    apiRequest(ENDPOINTS.ADMIN.MODERATORS.BASE, "POST", moderatorData),

  update: async (token, moderatorId, moderatorData) =>
    apiRequest(ENDPOINTS.ADMIN.MODERATORS.BY_ID(moderatorId), "PATCH", moderatorData),

  delete: async (token, moderatorId) =>
    apiRequest(ENDPOINTS.ADMIN.MODERATORS.BY_ID(moderatorId), "DELETE"),

  updateStatus: async (token, moderatorId, status) =>
    apiRequest(ENDPOINTS.ADMIN.MODERATORS.STATUS(moderatorId), "PATCH", { status }),

  bulkDelete: async (token, moderatorIds) =>
    apiRequest(ENDPOINTS.ADMIN.MODERATORS.BULK_DELETE, "POST", { ids: moderatorIds }),

  bulkSuspend: async (token, moderatorIds) =>
    apiRequest(ENDPOINTS.ADMIN.MODERATORS.BULK_STATUS, "POST", { ids: moderatorIds, status: "inactive" }),

  export: async (token, filters = {}) =>
    openExportUrl(ENDPOINTS.ADMIN.MODERATORS.EXPORT, filters),
};

export const vendors = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.ADMIN.VENDORS.BASE}${qs ? `?${qs}` : ""}`);
  },

  getById: async (token, vendorId) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.BY_ID(vendorId)),

  updateStatus: async (token, vendorId, status) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.STATUS(vendorId), "PATCH", { status }),

  approve: async (token, vendorId) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.STATUS(vendorId), "PATCH", { status: "approved" }),

  giveRating: async (token, vendorId, ratingData) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.RATING(vendorId), "PATCH", ratingData),

  delete: async (token, vendorId) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.BY_ID(vendorId), "DELETE"),

  bulkDelete: async (token, vendorIds) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.BULK_DELETE, "POST", { ids: vendorIds }),

  bulkApprove: async (token, vendorIds) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.BULK_STATUS, "POST", { ids: vendorIds, status: "approved" }),

  bulkSuspend: async (token, vendorIds) =>
    apiRequest(ENDPOINTS.ADMIN.VENDORS.BULK_STATUS, "POST", { ids: vendorIds, status: "suspended" }),

  export: async (token, filters = {}) =>
    openExportUrl(ENDPOINTS.ADMIN.VENDORS.EXPORT, filters),
};

export const events = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.ADMIN.EVENTS.ADMIN_ALL}${qs ? `?${qs}` : ""}`);
  },

  getById: async (token, eventId) =>
    apiRequest(ENDPOINTS.ADMIN.EVENTS.BY_ID(eventId)),

  createForHost: async (token, eventData) =>
    apiRequest(ENDPOINTS.ADMIN.EVENTS.CREATE_FOR_HOST, "POST", eventData),

  updateStatus: async (token, eventId, status) =>
    apiRequest(ENDPOINTS.ADMIN.EVENTS.STATUS(eventId), "PATCH", { status }),

  update: async (token, eventId, eventData) =>
    apiRequest(ENDPOINTS.ADMIN.EVENTS.BY_ID(eventId), "PATCH", eventData),

  delete: async (token, eventId) =>
    apiRequest(ENDPOINTS.ADMIN.EVENTS.BY_ID(eventId), "DELETE"),

  bulkDelete: async (token, eventIds) =>
    apiRequest(ENDPOINTS.ADMIN.EVENTS.BULK_DELETE, "POST", { ids: eventIds }),

  bulkSuspend: async (token, eventIds) =>
    apiRequest(ENDPOINTS.ADMIN.EVENTS.BULK_STATUS, "POST", { ids: eventIds, status: "suspended" }),

  export: async (token, filters = {}) =>
    openExportUrl(ENDPOINTS.ADMIN.EVENTS.EXPORT, filters),
};

// Tickets shim: re-exports from services/ticketsService.js with the legacy
// `{ success, data, error }` envelope. Token args are accepted but ignored.
export const tickets = {
  getAll: (_token, params = {}) => _envelope(ticketsGetAll(params)),

  getById: (_token, ticketId) => _envelope(ticketsGetById(ticketId)),

  assignTo: (_token, ticketId, assigneeId) =>
    _envelope(ticketsAssign(ticketId, assigneeId)),

  resolve: (_token, ticketId, resolution) =>
    _envelope(ticketsUpdateStatus(ticketId, { status: "resolved", resolution })),

  reopen: (_token, ticketId) =>
    _envelope(ticketsUpdateStatus(ticketId, { status: "in_progress" })),

  respond: (_token, ticketId, message) =>
    _envelope(ticketsUpdate(ticketId, { message })),

  delete: (_token, ticketId) => _envelope(ticketsDelete(ticketId)),

  export: (_token, filters = {}) => _envelope(ticketsExport(filters)),
};

export const payments = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.ADMIN.PAYMENTS.BASE}${qs ? `?${qs}` : ""}`);
  },

  getById: async (token, paymentId) =>
    apiRequest(ENDPOINTS.ADMIN.PAYMENTS.BY_ID(paymentId)),

  // Mutations target the canonical /payments/:id/{refund|capture|void} mounts
  // (host-self lock + manage RBAC verb live on those routes). The admin
  // surface re-uses them rather than mirroring under /admin/payments/:id.
  refund: async (token, paymentId, { amount, reason } = {}, idempotencyKey = null) => {
    const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
    return apiRequest(ENDPOINTS.PAYMENTS.REFUND(paymentId), "POST", { amount, reason }, headers);
  },

  capture: async (token, paymentId, { amount } = {}, idempotencyKey = null) => {
    const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
    return apiRequest(ENDPOINTS.PAYMENTS.CAPTURE(paymentId), "POST", { amount }, headers);
  },

  void: async (token, paymentId, idempotencyKey = null) => {
    const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
    return apiRequest(ENDPOINTS.PAYMENTS.VOID(paymentId), "POST", null, headers);
  },

  poll3ds: async (token, paymentId) =>
    apiRequest(ENDPOINTS.PAYMENTS.POLL_3DS(paymentId)),

  export: async (token, filters = {}) =>
    openExportUrl(ENDPOINTS.ADMIN.PAYMENTS.EXPORT, filters),
};

export const plans = {
  getAll: async (token) => apiRequest(ENDPOINTS.PLANS.ALL),
  getHostPlans: async (token) => apiRequest(ENDPOINTS.PLANS.HOST_PLANS),
  getBusinessPlans: async (token) => apiRequest(ENDPOINTS.PLANS.BUSINESS),
  getAllForAdmin: async (token, filters = {}) => apiRequest(ENDPOINTS.ADMIN.PLANS.ALL, "GET", null, { params: filters }),
  updatePlan: async (token, code, data) => apiRequest(ENDPOINTS.ADMIN.PLANS.BY_CODE(code), "PATCH", data),
  createPlan: async (token, data) => apiRequest(ENDPOINTS.ADMIN.PLANS.CREATE, "POST", data),
  deletePlan: async (token, code) => apiRequest(ENDPOINTS.ADMIN.PLANS.BY_CODE(code), "DELETE"),
};

// SUPER_ADMIN assigns a subscription to a host directly; audit log is wired server-side.
export const subscriptionsAdmin = {
  assign: async (token, data) =>
    apiRequest(ENDPOINTS.ADMIN.SUBSCRIPTIONS.ASSIGN, "POST", data),
};

// Legacy: prefer services/addonsService.js + useAddons / useCheckout in new code.
export const addons = {
  purchase: async (token, data, idempotencyKey = null) => {
    const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
    return apiRequest(ENDPOINTS.ADDONS.PURCHASE, "POST", data, headers);
  },
  adminActivate: async (token, addonId, data = {}, idempotencyKey = null) => {
    const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
    return apiRequest(ENDPOINTS.ADDONS.ADMIN_ACTIVATE(addonId), "POST", data, headers);
  },
  listMine: async (token, params = {}) => {
    const qs = Object.keys(params).length
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return apiRequest(`${ENDPOINTS.ADDONS.MY}${qs}`);
  },
};

export const whitelabels = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.ADMIN.WHITELABELS.BASE}${qs ? `?${qs}` : ""}`);
  },

  getById: async (token, whitelabelId) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.BY_ID(whitelabelId)),

  updateStatus: async (token, whitelabelId, status) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.STATUS(whitelabelId), "PATCH", { status }),

  updateSubscription: async (token, whitelabelId, subscriptionData) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.SUBSCRIPTION(whitelabelId), "PATCH", subscriptionData),

  delete: async (token, whitelabelId) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.BY_ID(whitelabelId), "DELETE"),

  bulkDelete: async (token, whitelabelIds) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.BULK_DELETE, "POST", { ids: whitelabelIds }),

  bulkSuspend: async (token, whitelabelIds) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.BULK_STATUS, "POST", { ids: whitelabelIds, status: "suspended" }),

  export: async (token, filters = {}) =>
    openExportUrl(ENDPOINTS.ADMIN.WHITELABELS.EXPORT, filters),

  getFeatures: async (token, whitelabelId) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.FEATURES(whitelabelId)),

  updateFeature: async (token, whitelabelId, featureName, enabled) =>
    apiRequest(ENDPOINTS.ADMIN.WHITELABELS.FEATURES(whitelabelId), "PATCH", { feature: featureName, enabled }),
};

export const discounts = {
  getAll: async (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.ADMIN.DISCOUNTS.BASE}${qs ? `?${qs}` : ""}`);
  },

  create: async (token, data) =>
    apiRequest(ENDPOINTS.ADMIN.DISCOUNTS.BASE, "POST", data),

  update: async (token, id, data) =>
    apiRequest(ENDPOINTS.ADMIN.DISCOUNTS.BY_ID(id), "PATCH", data),

  delete: async (token, id) =>
    apiRequest(ENDPOINTS.ADMIN.DISCOUNTS.BY_ID(id), "DELETE"),

  toggleStatus: async (token, id) =>
    apiRequest(ENDPOINTS.ADMIN.DISCOUNTS.TOGGLE(id), "PATCH"),

  validate: async (token, data) =>
    apiRequest(ENDPOINTS.ADMIN.DISCOUNTS.VALIDATE, "POST", data),
};

export default {
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

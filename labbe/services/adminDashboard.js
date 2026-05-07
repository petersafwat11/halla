/**
 * Admin Dashboard Service
 * Centralized API service for admin dashboard operations
 * Enhanced with duplicate error handling and package limit validation
 */

import apiClient, { APIError } from "./apiClient";

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
  getStats: async (period = "month", token = null, filters = {}) => {
    const qs = apiClient.buildQueryString({ period, ...filters });
    return apiClient.get(`/dashboard/admin${qs}`, { token });
  },
  getUserGrowth: async (
    period = "month",
    granularity = "day",
    token = null,
  ) => {
    return apiClient.get(
      `/dashboard/admin/users/growth?period=${period}&granularity=${granularity}`,
      { token },
    );
  },
  getRevenue: async (period = "month", granularity = "day", token = null) => {
    return apiClient.get(
      `/dashboard/admin/revenue?period=${period}&granularity=${granularity}`,
      { token },
    );
  },
  getEventStats: async (period = "month", token = null) => {
    return apiClient.get(`/dashboard/admin/events?period=${period}`, { token });
  },
  getSubscriptionStats: async (token = null) => {
    return apiClient.get(`/dashboard/admin/subscriptions`, { token });
  },
};

/**
 * Tickets Management API
 */
export const ticketsAPI = {
  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/tickets${qs}`, { token });
  },

  create: async (ticketData, token = null) => {
    return apiClient.post("/tickets", ticketData, { token });
  },

  createTicket: async (ticketData, token = null) => {
    return apiClient.post("/tickets", ticketData, { token });
  },

  getById: async (ticketId, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    return apiClient.get(`/tickets/${ticketId}`, { token });
  },

  getAssignees: async (token = null) => {
    return apiClient.get("/tickets/assignees", { token });
  },

  update: async (ticketId, data, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    return apiClient.patch(`/tickets/${ticketId}`, data, { token });
  },

  updateStatus: async (ticketId, status, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    return apiClient.patch(
      `/tickets/${ticketId}/status`,
      { status },
      { token },
    );
  },

  updatePriority: async (ticketId, priority, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    return apiClient.patch(
      `/tickets/${ticketId}`,
      { priority },
      { token },
    );
  },

  assignTo: async (ticketId, assigneeId, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    return apiClient.patch(
      `/tickets/${ticketId}/assign`,
      { assigneeId },
      { token },
    );
  },

  resolveTicket: async (ticketId, resolutionMessage, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    if (!resolutionMessage)
      throw new Error("Resolution message is required to resolve a ticket");
    return apiClient.patch(
      `/tickets/${ticketId}/status`,
      { status: "resolved", resolution: resolutionMessage },
      { token },
    );
  },

  reopenTicket: async (ticketId, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    return apiClient.patch(
      `/tickets/${ticketId}/status`,
      { status: "open" },
      { token },
    );
  },

  respond: async (ticketId, message, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    if (!message) throw new Error("Response message is required");
    return apiClient.patch(
      `/tickets/${ticketId}`,
      { message },
      { token },
    );
  },

  delete: async (ticketId, token = null) => {
    if (!ticketId) throw new Error("Ticket ID is required");
    return apiClient.delete(`/tickets/${ticketId}`, { token });
  },

  bulkDelete: async (ticketIds, token = null) => {
    if (!ticketIds || ticketIds.length === 0)
      throw new Error("Ticket IDs are required");
    if (ticketIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = ticketIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiClient.post(
      `/tickets/bulk-delete`,
      { ids: ticketIds },
      { token },
    );
  },

  bulkResolve: async (ticketIds, token = null) => {
    if (!ticketIds || ticketIds.length === 0)
      throw new Error("Ticket IDs are required");
    return apiClient.post(
      `/tickets/bulk-resolve`,
      { ids: ticketIds },
      { token },
    );
  },

  export: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    const blob = await apiClient.get(`/tickets/export${qs}`, { token });
    return downloadBlob(
      blob,
      `tickets_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },
};

/**
 * Hosts Management API (Extended with subscription management)
 */
export const hostsAPI = {
  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/hosts${qs}`, { token });
  },

  getById: async (hostId, token = null) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiClient.get(`/admin/hosts/${hostId}`, { token });
  },

  create: async (hostData, token = null) => {
    return apiClient.post("/admin/hosts", hostData, { token });
  },

  updateStatus: async (hostId, status, token = null) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiClient.patch(
      `/admin/hosts/${hostId}/status`,
      { status },
      { token },
    );
  },

  updateSubscription: async (
    hostId,
    planCode,
    billingCycle = null,
    token = null,
  ) => {
    if (!hostId) throw new Error("Host ID is required");
    const body = { planCode };
    if (billingCycle) {
      body.billingCycle = billingCycle;
    }
    return apiClient.patch(`/admin/hosts/${hostId}/subscription`, body, {
      token,
    });
  },

  delete: async (hostId, token = null) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiClient.delete(`/admin/hosts/${hostId}`, { token });
  },

  bulkDelete: async (hostIds, token = null) => {
    if (!hostIds || hostIds.length === 0)
      throw new Error("Host IDs are required");
    if (hostIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = hostIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiClient.post(
      `/admin/hosts/bulk-delete`,
      { hostIds },
      { token },
    );
  },

  export: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    const blob = await apiClient.get(`/admin/hosts/export${qs}`, { token });
    return downloadBlob(
      blob,
      `hosts_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },

  verifyByPhone: async (phoneNumber, token = null) => {
    if (!phoneNumber) throw new Error("Phone number is required");
    return apiClient.get(
      `/admin/hosts/verify-phone?phoneNumber=${encodeURIComponent(
        phoneNumber,
      )}`,
      { token },
    );
  },

  sendNotification: async (hostId, notificationData, token = null) => {
    if (!hostId) throw new Error("Host ID is required");
    return apiClient.post(`/notifications/send`, {
      userIds: [hostId],
      ...notificationData,
    }, { token });
  },

  notifyAll: async (notificationData, token = null) => {
    return apiClient.post(`/notifications/broadcast`, {
      role: "host",
      ...notificationData,
    }, { token });
  },

  /**
   * Find or create a host by phone number
   * Used when creating events for hosts that may not exist yet
   */
  findOrCreate: async (hostData, token = null) => {
    return apiClient.post("/admin/hosts/find-or-create", hostData, { token });
  },

  /**
   * Get event targets (hosts and whitelabels) for admin event creation
   */
  getEventTargets: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/event-targets${qs}`, { token });
  },

  /**
   * Get subscription info for a specific user (for event creation validation)
   */
  getUserSubscriptionInfo: async (userId, token = null) => {
    if (!userId) throw new Error("User ID is required");
    return apiClient.get(`/admin/users/${userId}/subscription-info`, { token });
  },
};

/**
 * Moderators/Admins Management API
 */
export const moderatorsAPI = {
  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/moderators${qs}`, { token });
  },

  create: async (adminData, token = null) => {
    return apiClient.post("/admin/moderators", adminData, { token });
  },

  update: async (adminId, adminData, token = null) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiClient.patch(`/admin/moderators/${adminId}`, adminData, {
      token,
    });
  },

  delete: async (adminId, token = null) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiClient.delete(`/admin/moderators/${adminId}`, { token });
  },

  bulkDelete: async (adminIds, token = null) => {
    if (!adminIds || adminIds.length === 0)
      throw new Error("Admin IDs are required");
    if (adminIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = adminIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiClient.post(
      `/admin/moderators/bulk-delete`,
      { moderatorIds: adminIds },
      { token },
    );
  },

  export: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    const blob = await apiClient.get(`/admin/moderators/export${qs}`, { token });
    return downloadBlob(
      blob,
      `moderators_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },

  updateStatus: async (adminId, status, token = null) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiClient.patch(
      `/admin/moderators/${adminId}/status`,
      { status },
      { token },
    );
  },

  sendNotification: async (adminId, notificationData, token = null) => {
    if (!adminId) throw new Error("Admin ID is required");
    return apiClient.post(
      `/notifications/send`,
      { userIds: [adminId], ...notificationData },
      { token },
    );
  },

  notifyAll: async (notificationData, token = null) => {
    return apiClient.post(`/notifications/broadcast`, {
      role: "moderator",
      ...notificationData,
    }, { token });
  },
};

/**
 * Whitelabel Management API
 */
export const whitelabelAPI = {
  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/whitelabels${qs}`, { token });
  },

  getById: async (whitelabelId, token = null) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiClient.get(`/admin/whitelabels/${whitelabelId}`, { token });
  },

  create: async (data, token = null) => {
    return apiClient.post("/admin/whitelabels", data, { token });
  },

  update: async (whitelabelId, data, token = null) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiClient.patch(`/admin/whitelabels/${whitelabelId}`, data, {
      token,
    });
  },

  updateStatus: async (whitelabelId, status, token = null) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiClient.patch(
      `/admin/whitelabels/${whitelabelId}/status`,
      { status },
      { token },
    );
  },

  delete: async (whitelabelId, token = null) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiClient.delete(`/admin/whitelabels/${whitelabelId}`, { token });
  },

  bulkDelete: async (whitelabelIds, token = null) => {
    if (!whitelabelIds || whitelabelIds.length === 0)
      throw new Error("Whitelabel IDs are required");
    if (whitelabelIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = whitelabelIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiClient.post(
      `/admin/whitelabels/bulk-delete`,
      { whitelabelIds },
      { token },
    );
  },

  updateSubscription: async (
    whitelabelId,
    subscriptionData,
    token = null,
  ) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiClient.patch(
      `/admin/whitelabels/${whitelabelId}/subscription`,
      subscriptionData,
      { token },
    );
  },

  /**
   * Update whitelabel settings (branding, etc.)
   * Supports both JSON data and FormData for file uploads
   */
  updateSettings: async (data, token = null) => {
    const isFormData = data instanceof FormData;
    return apiClient.patch("/whitelabel/settings", data, {
      token,
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
  },

  /**
   * Get whitelabel settings
   */
  getSettings: async (token = null) => {
    return apiClient.get("/whitelabel/settings", { token });
  },

  sendNotification: async (whitelabelId, notificationData, token = null) => {
    if (!whitelabelId) throw new Error("Whitelabel ID is required");
    return apiClient.post(
      `/notifications/send`,
      { userIds: [whitelabelId], ...notificationData },
      { token },
    );
  },

  notifyAll: async (notificationData, token = null) => {
    return apiClient.post(`/notifications/broadcast`, {
      role: "whitelabel_admin",
      ...notificationData,
    }, { token });
  },

  export: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    const blob = await apiClient.get(`/admin/whitelabels/export${qs}`, { token });
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
  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/vendors${qs}`, { token });
  },

  getById: async (vendorId, token = null) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiClient.get(`/admin/vendors/${vendorId}`, { token });
  },

  updateStatus: async (vendorId, status, token = null) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiClient.patch(
      `/admin/vendors/${vendorId}/status`,
      { status },
      { token },
    );
  },

  approve: async (vendorId, token = null) => {
    return vendorsAPI.updateStatus(vendorId, "approved", token);
  },

  giveRating: async (vendorId, rating, token = null) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiClient.patch(
      `/admin/vendors/${vendorId}/rating`,
      { rating },
      { token },
    );
  },

  delete: async (vendorId, token = null) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiClient.delete(`/admin/vendors/${vendorId}`, { token });
  },

  bulkDelete: async (vendorIds, token = null) => {
    if (!vendorIds || vendorIds.length === 0)
      throw new Error("Vendor IDs are required");
    if (vendorIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = vendorIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiClient.post(
      `/admin/vendors/bulk-delete`,
      { vendorIds },
      { token },
    );
  },

  bulkApprove: async (vendorIds, token = null) => {
    return vendorsAPI.bulkUpdateStatus(vendorIds, "approved", token);
  },

  bulkSuspend: async (vendorIds, token = null) => {
    return vendorsAPI.bulkUpdateStatus(vendorIds, "suspended", token);
  },

  bulkUpdateStatus: async (vendorIds, status, token = null) => {
    if (!vendorIds || vendorIds.length === 0)
      throw new Error("Vendor IDs are required");
    if (vendorIds.length > 100)
      throw new Error("Cannot update more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = vendorIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiClient.post(
      `/admin/vendors/bulk-status`,
      { vendorIds, status },
      { token },
    );
  },

  export: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    const blob = await apiClient.get(`/admin/vendors/export${qs}`, { token });
    return downloadBlob(
      blob,
      `vendors_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },

  sendNotification: async (vendorId, notificationData, token = null) => {
    if (!vendorId) throw new Error("Vendor ID is required");
    return apiClient.post(
      `/notifications/send`,
      { userIds: [vendorId], ...notificationData },
      { token },
    );
  },

  notifyAll: async (notificationData, token = null) => {
    return apiClient.post(`/notifications/broadcast`, {
      role: "vendor",
      ...notificationData,
    }, { token });
  },
};

/**
 * Events Management API
 */
export const eventsAPI = {
  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/events${qs}`, { token });
  },

  getById: async (eventId, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiClient.get(`/admin/events/${eventId}`, { token });
  },

  updateStatus: async (eventId, status, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiClient.patch(
      `/admin/events/${eventId}/status`,
      { status },
      { token },
    );
  },

  delete: async (eventId, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiClient.delete(`/events/admin/${eventId}`, { token });
  },

  bulkDelete: async (eventIds, token = null) => {
    if (!eventIds || eventIds.length === 0)
      throw new Error("Event IDs are required");
    if (eventIds.length > 100)
      throw new Error("Cannot delete more than 100 items at once");
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const invalidIds = eventIds.filter((id) => !objectIdRegex.test(id));
    if (invalidIds.length > 0)
      throw new Error(`Invalid ObjectId format in ids: ${invalidIds[0]}`);
    return apiClient.post(
      `/admin/events/bulk-delete`,
      { eventIds },
      { token },
    );
  },

  createForHost: async (formData, token = null) => {
    return apiClient.post("/admin/events/create-for-host", formData, { token });
  },

  /**
   * Update event (admin)
   */
  updateEvent: async (eventId, eventData, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiClient.patch(`/admin/events/${eventId}`, eventData, { token });
  },

  /**
   * Get event stats (admin) - includes RSVP stats, guests, subscription info
   */
  getEventStats: async (eventId, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiClient.get(`/admin/events/${eventId}/stats`, { token });
  },

  /**
   * Send test message for event (admin)
   */
  sendTestMessage: async (eventId, phoneNumber, channel = 'whatsapp', token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiClient.patch(
      `/admin/events/${eventId}/test-message`,
      { phoneNumber, channel },
      { token },
    );
  },

  /**
   * Update event launch settings (admin)
   */
  updateLaunchSettings: async (eventId, launchSettings, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    return apiClient.patch(
      `/admin/events/${eventId}/launch-settings`,
      launchSettings,
      { token },
    );
  },

  /**
   * Delete event guest (admin)
   */
  deleteGuest: async (eventId, guestId, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    if (!guestId) throw new Error("Guest ID is required");
    return apiClient.delete(`/events/${eventId}/guests/${guestId}`, { token });
  },

  /**
   * Update event guest (admin)
   */
  updateGuest: async (eventId, guestId, guestData, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    if (!guestId) throw new Error("Guest ID is required");
    return apiClient.put(`/events/${eventId}/guests/${guestId}`, guestData, {
      token,
    });
  },

  /**
   * Export event guests (admin)
   */
  exportGuests: async (eventId, token = null) => {
    if (!eventId) throw new Error("Event ID is required");
    const blob = await apiClient.get(`/events/export/${eventId}/guests`, {
      token,
    });

    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-${eventId}-guests.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true, message: "Guests exported successfully" };
  },

  export: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    const blob = await apiClient.get(`/admin/events/export${qs}`, { token });
    return downloadBlob(
      blob,
      `events_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },
};

/**
 * Payments Management API
 */
export const paymentsAPI = {
  getSummary: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/payments/summary${qs}`, { token });
  },

  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/admin/payments${qs}`, { token });
  },

  getById: async (paymentId, token = null) => {
    if (!paymentId) throw new Error("Payment ID is required");
    return apiClient.get(`/admin/payments/${paymentId}`, { token });
  },

  export: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    const blob = await apiClient.get(`/admin/payments/export${qs}`, { token });
    return downloadBlob(
      blob,
      `payments_export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  },

  // §15.6: the caller MUST supply `idempotencyKey` (one UUID per modal
  // session) so a double-click of "Refund" reuses the same key.
  // Generating a fresh UUID here would defeat idempotency.
  refund: async (paymentId, { amount, reason } = {}, idempotencyKey, token = null) => {
    if (!paymentId) throw new Error("Payment ID is required");
    if (!idempotencyKey) throw new Error("idempotencyKey is required");
    return apiClient.post(`/payments/${paymentId}/refund`, { amount, reason }, {
      token,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  },

  capture: async (paymentId, { amount } = {}, idempotencyKey, token = null) => {
    if (!paymentId) throw new Error("Payment ID is required");
    if (!idempotencyKey) throw new Error("idempotencyKey is required");
    return apiClient.post(`/payments/${paymentId}/capture`, { amount }, {
      token,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  },

  void: async (paymentId, idempotencyKey, token = null) => {
    if (!paymentId) throw new Error("Payment ID is required");
    if (!idempotencyKey) throw new Error("idempotencyKey is required");
    return apiClient.post(`/payments/${paymentId}/void`, {}, {
      token,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  },
};

/**
 * Plans Management API
 */
export const plansAPI = {
  getAll: async (token = null) => {
    return apiClient.get("/plans", { token });
  },

  getEnterprisePlans: async (token = null) => {
    return apiClient.get("/plans/enterprise", { token });
  },

  getHostPlans: async (token = null) => {
    return apiClient.get("/plans/host", { token });
  },

  // Super Admin Only - Plan Management
  getAllForAdmin: async (token = null) => {
    return apiClient.get("/plans/admin/all", { token });
  },

  getByCode: async (code, token = null) => {
    if (!code) throw new Error("Plan code is required");
    return apiClient.get(`/plans/admin/${code}`, { token });
  },

  updatePlan: async (code, data, token = null) => {
    if (!code) throw new Error("Plan code is required");
    return apiClient.patch(`/plans/admin/${code}`, data, { token });
  },

  bulkUpdate: async (updates, token = null) => {
    if (!updates || updates.length === 0)
      throw new Error("Updates array is required");
    return apiClient.patch("/plans/admin/bulk-update", { updates }, { token });
  },

  // H-14: Phase 2 admin plan endpoints — were defined backend-only and
  // unreachable from the dashboard. Wire them up so SUPER_ADMIN can
  // create/delete plans without curl.
  createPlan: async (data, token = null) => {
    if (!data) throw new Error("Plan payload is required");
    return apiClient.post("/plans/admin", data, { token });
  },

  deletePlan: async (code, token = null) => {
    if (!code) throw new Error("Plan code is required");
    return apiClient.delete(`/plans/admin/${code}`, { token });
  },
};

/**
 * SUPER_ADMIN can assign a subscription to a host directly (e.g. comp /
 * migration). Audit log is wired server-side.
 */
export const subscriptionAdminAPI = {
  assign: async (data, token = null) => {
    if (!data?.userId || !data?.planCode)
      throw new Error("userId and planCode are required");
    return apiClient.post("/subscriptions/admin/assign", data, { token });
  },
};

/**
 * Legacy addons API surface. New code should use the `useAddons` and
 * `useCheckout` hooks from `hooks/reactQueryHooks/`. This export remains
 * for the admin dashboard's bulk operations.
 */
export const addonsAPI = {
  purchase: async (data, token = null, idempotencyKey = null) => {
    return apiClient.post("/addons/purchase", data, {
      token,
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    });
  },

  adminActivate: async (addonId, data, token = null, idempotencyKey = null) => {
    if (!addonId) throw new Error("addonId is required");
    return apiClient.post(`/addons/admin/${addonId}/activate`, data, {
      token,
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    });
  },

  listMine: async (token = null, params = {}) => {
    const qs = Object.keys(params).length
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return apiClient.get(`/addons${qs}`, { token });
  },
};

/**
 * Discounts / Coupon Codes Management API
 */
export const discountsAPI = {
  getAll: async (filters = {}, token = null) => {
    const qs = apiClient.buildQueryString(filters);
    return apiClient.get(`/discounts/admin${qs}`, { token });
  },

  getById: async (id, token = null) => {
    if (!id) throw new Error("Discount ID is required");
    return apiClient.get(`/discounts/admin/${id}`, { token });
  },

  create: async (data, token = null) => {
    return apiClient.post("/discounts/admin", data, { token });
  },

  update: async (id, data, token = null) => {
    if (!id) throw new Error("Discount ID is required");
    return apiClient.patch(`/discounts/admin/${id}`, data, { token });
  },

  toggleStatus: async (id, token = null) => {
    if (!id) throw new Error("Discount ID is required");
    return apiClient.patch(`/discounts/admin/${id}/toggle`, {}, { token });
  },

  delete: async (id, token = null) => {
    if (!id) throw new Error("Discount ID is required");
    return apiClient.delete(`/discounts/admin/${id}`, { token });
  },

  /**
   * Validate a discount code for a given plan amount (used on summary page)
   */
  validate: async (code, amount, planType = null, token = null) => {
    return apiClient.post("/discounts/validate", { code, amount, planType }, { token });
  },
};

/**
 * Combined Admin Dashboard API
 */
const adminDashboardAPI = {
  dashboard: dashboardAPI,
  tickets: ticketsAPI,
  hosts: hostsAPI,
  moderators: moderatorsAPI,
  whitelabel: whitelabelAPI,
  whitelabels: whitelabelAPI, // Alias for backward compatibility
  vendors: vendorsAPI,
  events: eventsAPI,
  payments: paymentsAPI,
  plans: plansAPI,
  discounts: discountsAPI,
};

// Alias for backward compatibility with old lib/admin.js imports
// Provides adminAPI.hosts.* pattern used by admin components
export const adminAPI = {
  hosts: hostsAPI,
  tickets: ticketsAPI,
  moderators: moderatorsAPI,
};

export default adminDashboardAPI;

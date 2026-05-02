/**
 * Ticket Service Functions
 * Helper functions and API calls for ticket management
 */

import apiClient from "./apiClient";

/**
 * Ticket types matching backend TicketModel
 */
export const TICKET_TYPES = {
  TECHNICAL: "technical",
  PAYMENT: "payment",
  EVENT: "event",
  USER: "user",
  OTHER: "other",
  INQUIRY: "inquiry",
  ISSUE: "issue",
  REQUEST: "request",
  SUGGESTION: "suggestion",
};

/**
 * Ticket status matching backend constants
 */
export const TICKET_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  WAITING_RESPONSE: "waiting_response",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

/**
 * Ticket priority levels
 */
export const TICKET_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

/**
 * Ticket API functions
 */
export const ticketService = {
  /**
   * Create a new ticket
   * @param {Object} ticketData - Ticket data
   * @param {string} ticketData.type - Ticket type
   * @param {string} ticketData.message - Ticket message
   * @param {string} [ticketData.priority] - Ticket priority (optional)
   * @returns {Promise<Object>} Created ticket
   */
  createTicket: async (ticketData) => {
    const payload = {
      type: ticketData.type || TICKET_TYPES.OTHER,
      message: ticketData.message,
      priority: ticketData.priority || TICKET_PRIORITY.MEDIUM,
    };

    return apiClient.post("/tickets", payload);
  },

  /**
   * Get all tickets for current user
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.status] - Filter by status
   * @param {string} [filters.type] - Filter by type
   * @returns {Promise<Object>} List of tickets
   */
  getTickets: async (filters = {}) => {
    const queryString = apiClient.buildQueryString(filters);
    return apiClient.get(`/tickets${queryString}`);
  },

  /**
   * Get a single ticket by ID
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Ticket details
   */
  getTicket: async (ticketId) => {
    return apiClient.get(`/tickets/${ticketId}`);
  },

  /**
   * Update a ticket
   * @param {string} ticketId - Ticket ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated ticket
   */
  updateTicket: async (ticketId, updateData) => {
    return apiClient.patch(`/tickets/${ticketId}`, updateData);
  },

  /**
   * Delete a ticket
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteTicket: async (ticketId) => {
    return apiClient.delete(`/tickets/${ticketId}`);
  },
};

/**
 * Helper functions for ticket management
 */
export const ticketHelpers = {
  /**
   * Get ticket type label for display
   * @param {string} type - Ticket type
   * @param {Function} t - Translation function
   * @returns {string} Translated label
   */
  getTypeLabel: (type, t) => {
    const labels = {
      [TICKET_TYPES.TECHNICAL]: t?.("types.technical") || "مشكلة تقنية",
      [TICKET_TYPES.PAYMENT]: t?.("types.payment") || "مشكلة في الدفع",
      [TICKET_TYPES.EVENT]: t?.("types.event") || "مشكلة في الفعالية",
      [TICKET_TYPES.USER]: t?.("types.user") || "مشكلة في الحساب",
      [TICKET_TYPES.OTHER]: t?.("types.other") || "أخرى",
      [TICKET_TYPES.INQUIRY]: t?.("types.inquiry") || "استفسار",
      [TICKET_TYPES.ISSUE]: t?.("types.issue") || "مشكلة",
      [TICKET_TYPES.REQUEST]: t?.("types.request") || "طلب",
      [TICKET_TYPES.SUGGESTION]: t?.("types.suggestion") || "اقتراح",
    };
    return labels[type] || type;
  },

  /**
   * Get ticket status label for display
   * @param {string} status - Ticket status
   * @param {Function} t - Translation function
   * @returns {string} Translated label
   */
  getStatusLabel: (status, t) => {
    const labels = {
      [TICKET_STATUS.OPEN]: t?.("status.open") || "مفتوحة",
      [TICKET_STATUS.IN_PROGRESS]: t?.("status.in_progress") || "قيد المعالجة",
      [TICKET_STATUS.WAITING_RESPONSE]: t?.("status.waiting_response") || "بانتظار الرد",
      [TICKET_STATUS.RESOLVED]: t?.("status.resolved") || "تم الحل",
      [TICKET_STATUS.CLOSED]: t?.("status.closed") || "مغلقة",
    };
    return labels[status] || status;
  },

  /**
   * Get ticket priority label for display
   * @param {string} priority - Ticket priority
   * @param {Function} t - Translation function
   * @returns {string} Translated label
   */
  getPriorityLabel: (priority, t) => {
    const labels = {
      [TICKET_PRIORITY.LOW]: t?.("priority.low") || "منخفضة",
      [TICKET_PRIORITY.MEDIUM]: t?.("priority.medium") || "متوسطة",
      [TICKET_PRIORITY.HIGH]: t?.("priority.high") || "عالية",
      [TICKET_PRIORITY.URGENT]: t?.("priority.urgent") || "عاجلة",
    };
    return labels[priority] || priority;
  },

  /**
   * Get status color for styling
   * @param {string} status - Ticket status
   * @returns {string} Color code
   */
  getStatusColor: (status) => {
    const colors = {
      [TICKET_STATUS.OPEN]: "#3498db",
      [TICKET_STATUS.IN_PROGRESS]: "#f39c12",
      [TICKET_STATUS.WAITING_RESPONSE]: "#9b59b6",
      [TICKET_STATUS.RESOLVED]: "#27ae60",
      [TICKET_STATUS.CLOSED]: "#95a5a6",
    };
    return colors[status] || "#95a5a6";
  },

  /**
   * Get priority color for styling
   * @param {string} priority - Ticket priority
   * @returns {string} Color code
   */
  getPriorityColor: (priority) => {
    const colors = {
      [TICKET_PRIORITY.LOW]: "#95a5a6",
      [TICKET_PRIORITY.MEDIUM]: "#3498db",
      [TICKET_PRIORITY.HIGH]: "#f39c12",
      [TICKET_PRIORITY.URGENT]: "#e74c3c",
    };
    return colors[priority] || "#3498db";
  },

  /**
   * Format ticket date for display
   * @param {string} dateString - ISO date string
   * @param {string} locale - Locale for formatting
   * @returns {string} Formatted date
   */
  formatDate: (dateString, locale = "ar-SA") => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  /**
   * Get ticket type options for select input
   * @param {Function} t - Translation function
   * @returns {Array} Array of options
   */
  getTypeOptions: (t) => {
    return Object.values(TICKET_TYPES).map((type) => ({
      value: type,
      label: ticketHelpers.getTypeLabel(type, t),
    }));
  },

  /**
   * Get ticket priority options for select input
   * @param {Function} t - Translation function
   * @returns {Array} Array of options
   */
  getPriorityOptions: (t) => {
    return Object.values(TICKET_PRIORITY).map((priority) => ({
      value: priority,
      label: ticketHelpers.getPriorityLabel(priority, t),
    }));
  },
};

export default ticketService;

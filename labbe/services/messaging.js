/**
 * Messaging Service
 * Handles SMS/WhatsApp invitation API calls
 */

import apiClient from "./apiClient";

const messagingService = {
  /**
   * Send invitation to a single guest
   * @param {string} guestId - Guest ID
   * @param {string} eventId - Event ID
   * @param {string} channel - 'sms' or 'whatsapp'
   * @param {string} lang - Language code
   */
  async sendInvitation(guestId, eventId, channel = "sms") {
    const response = await apiClient.post("/messaging/send", {
      guestId,
      eventId,
      channel,
    });
    return response.data;
  },

  /**
   * Send invitations to multiple guests
   * @param {string[]} guestIds - Array of guest IDs
   * @param {string} eventId - Event ID
   * @param {string} channel - 'sms' or 'whatsapp'
   * @param {string} lang - Language code
   */
  async sendBulkInvitations(guestIds, eventId, channel = "sms") {
    const response = await apiClient.post("/messaging/send-bulk", {
      guestIds,
      eventId,
      channel,
    });
    return response.data;
  },

  /**
   * Retry failed invitations for an event
   * @param {string} eventId - Event ID
   * @param {string} channel - 'sms' or 'whatsapp'
   * @param {string} lang - Language code
   */
  async retryFailedInvitations(eventId, channel = "sms") {
    const response = await apiClient.post("/messaging/retry", {
      eventId,
      channel,
    });
    return response.data;
  },

  /**
   * Send test invitation (for host preview)
   * @param {string} phoneNumber - Phone number
   * @param {string} eventId - Event ID
   * @param {string} channel - 'sms' or 'whatsapp'
   * @param {string} lang - Language code
   */
  async sendTestInvitation(phoneNumber, eventId, channel = "sms") {
    // FLOW-16-F01: migrated to canonical events endpoint
    const response = await apiClient.patch(`/events/${eventId}/test-message`, {
      phoneNumber,
      channel,
    });
    return response.data;
  },

  /**
   * Send reminder to pending guests
   * @param {string} eventId - Event ID
   * @param {string} channel - 'sms' or 'whatsapp'
   * @param {string} lang - Language code
   * @param {string} message - Custom message (optional)
   */
  async sendReminder(eventId, channel = "sms", customMessage = null) {
    const response = await apiClient.post("/messaging/send-reminder", {
      eventId,
      channel,
      ...(customMessage && { customMessage }),
    });
    return response.data;
  },

  /**
   * Get invitation statistics for an event
   * @param {string} eventId - Event ID
   */
  async getInvitationStats(eventId) {
    const response = await apiClient.get(`/messaging/stats/${eventId}`);
    return response.data;
  },

  /**
   * Check SMS balance
   */
  async checkBalance() {
    const response = await apiClient.get("/messaging/balance");
    return response.data;
  },

  async scheduleSend(eventId, scheduledDate, scheduledTime, channel = "whatsapp") {
    const response = await apiClient.post("/messaging/schedule", {
      eventId,
      scheduledDate,
      scheduledTime,
      channel,
    });
    return response.data;
  },

  async submitTemplate(eventId) {
    const response = await apiClient.post("/messaging/template/submit", {
      eventId,
    });
    return response.data;
  },

  async getTemplateStatus(eventId) {
    const response = await apiClient.get(`/messaging/template/status/${eventId}`);
    return response.data;
  },
};

export default messagingService;

/**
 * Subscription Service
 * Handles all subscription-related API calls
 */

import { API_BASE_URL, ENDPOINTS } from "../config/api";

class SubscriptionService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Make authenticated request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @param {string} token - Auth token
   * @returns {Promise<Object>}
   */
  async request(endpoint, options = {}, token) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || "Request failed");
      error.status = response.status;
      error.data = data;
      error.field = data.field;
      throw error;
    }

    return data;
  }

  /**
   * Get current user's active subscription
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Subscription data
   */
  async getMySubscription(token) {
    try {
      return await this.request(
        ENDPOINTS.SUBSCRIPTIONS.MY_SUBSCRIPTION,
        { method: "GET" },
        token,
      );
    } catch (error) {
      console.error(
        "[SUBSCRIPTION SERVICE] Error fetching subscription:",
        error,
      );
      throw error;
    }
  }

  /**
   * Create a new subscription
   * @param {Object} params - Subscription details
   * @param {string} params.planCode - Plan code (e.g., 'basic_event_50')
   * @param {string} [params.discountCode] - Optional discount code
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Created subscription
   */
  async subscribe({ planCode, discountCode }, token) {
    try {
      const payload = { planCode };
      if (discountCode) payload.discountCode = discountCode;

      return await this.request(
        ENDPOINTS.SUBSCRIPTIONS.SUBSCRIBE,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token,
      );
    } catch (error) {
      console.error(
        "[SUBSCRIPTION SERVICE] Error creating subscription:",
        error,
      );
      throw error;
    }
  }

  /**
   * Upgrade to a new plan
   * @param {Object} upgradeData - Upgrade details
   * @param {string} upgradeData.planCode - New plan code
   * @param {string} upgradeData.billingCycle - New billing cycle
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Updated subscription
   */
  async upgrade(upgradeData, token) {
    try {
      return await this.request(
        ENDPOINTS.SUBSCRIPTIONS.CHANGE_PLAN,
        {
          method: "POST",
          body: JSON.stringify(upgradeData),
        },
        token,
      );
    } catch (error) {
      console.error(
        "[SUBSCRIPTION SERVICE] Error upgrading subscription:",
        error,
      );
      throw error;
    }
  }

  /**
   * Cancel subscription
   * @param {Object} cancelData - Cancellation details
   * @param {string} cancelData.reason - Cancellation reason
   * @param {boolean} cancelData.immediate - Cancel immediately or at period end
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Cancelled subscription
   */
  async cancel(cancelData, token) {
    try {
      return await this.request(
        ENDPOINTS.SUBSCRIPTIONS.CANCEL,
        {
          method: "POST",
          body: JSON.stringify(cancelData),
        },
        token,
      );
    } catch (error) {
      console.error(
        "[SUBSCRIPTION SERVICE] Error cancelling subscription:",
        error,
      );
      throw error;
    }
  }

  /**
   * Validate limits before action
   * @param {string} action - 'event', 'guest', or 'moderator'
   * @param {number} count - Count to validate
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Validation result
   */
  async validateLimits(action, count, token) {
    try {
      return await this.request(
        ENDPOINTS.SUBSCRIPTIONS.VALIDATE_LIMITS,
        {
          method: "POST",
          body: JSON.stringify({ action, count }),
        },
        token,
      );
    } catch (error) {
      console.error("[SUBSCRIPTION SERVICE] Error validating limits:", error);
      throw error;
    }
  }

  /**
   * Get subscription limits
   * @param {string} token - Auth token
   * @returns {Promise<Object>} Limits data
   */
  async getLimits(token) {
    try {
      return await this.request(
        ENDPOINTS.SUBSCRIPTIONS.LIMITS,
        { method: "GET" },
        token,
      );
    } catch (error) {
      console.error("[SUBSCRIPTION SERVICE] Error fetching limits:", error);
      throw error;
    }
  }
}

export default new SubscriptionService();

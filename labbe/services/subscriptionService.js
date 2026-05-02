/**
 * Subscription Service
 * Handles subscription management for hosts
 */

import apiClient from "./apiClient";

/**
 * Get current user's active subscription
 * @param {string} [token] - Optional auth token
 * @returns {Promise<Object>} Subscription data
 */
export const getMySubscription = async (token = null) => {
  return apiClient.get("/subscriptions/my-subscription", { token });
};

/**
 * Create a new subscription
 * @param {Object} subscriptionData - Subscription details
 * @param {string} subscriptionData.planCode - Plan code (e.g., 'basic_event', 'premium_monthly')
 * @param {string} [subscriptionData.discountCode] - Optional discount/promo code
 * @param {string} [token] - Optional auth token
 * @returns {Promise<Object>} Created subscription
 */
export const subscribe = async (subscriptionData, token = null) => {
  return apiClient.post("/subscriptions/subscribe", subscriptionData, {
    token,
  });
};

const subscriptionService = {
  getMySubscription,
  subscribe,
};

export default subscriptionService;

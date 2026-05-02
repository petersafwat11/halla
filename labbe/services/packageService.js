/**
 * Package Service
 * Handles package limits validation for events, guests, and moderators
 */

import apiClient from "./apiClient";

/**
 * Validate if user can create a new event
 * @param {string} [token] - Optional auth token
 * @returns {Promise<Object>} Validation result with canCreate, current, limit
 */
export const validateEventCreation = async (token = null) => {
  try {
    const response = await apiClient.post(
      "/subscriptions/validate-limits",
      { action: "event", count: 1 },
      { token },
    );
    const data = response.data || response;
    return {
      canCreate: data.allowed !== false,
      current: data.current || 0,
      limit: data.limit || -1,
      suggestedPlan: data.suggestedPlan,
    };
  } catch (error) {
    // Return default allowing creation if endpoint doesn't exist
    if (error.status === 404) {
      return { canCreate: true, current: 0, limit: -1 };
    }
    throw error;
  }
};

/**
 * Check guest limit for an event
 * @param {string} eventId - Event ID
 * @param {number} count - Number of guests to add
 * @param {string} [token] - Optional auth token
 * @returns {Promise<Object>} Validation result
 */
export const checkGuestLimit = async (eventId, count = 1, token = null) => {
  try {
    const response = await apiClient.post(
      "/subscriptions/validate-limits",
      { action: "guest", count, eventId },
      { token },
    );
    return response.data || response;
  } catch (error) {
    if (error.status === 404) {
      return { allowed: true, current: 0, limit: -1 };
    }
    throw error;
  }
};

/**
 * Check moderator limit for an event
 * @param {string} eventId - Event ID
 * @param {number} count - Number of moderators to add
 * @param {string} [token] - Optional auth token
 * @returns {Promise<Object>} Validation result
 */
export const checkModeratorLimit = async (eventId, count = 1, token = null) => {
  try {
    const response = await apiClient.post(
      "/subscriptions/validate-limits",
      { action: "moderator", count, eventId },
      { token },
    );
    return response.data || response;
  } catch (error) {
    if (error.status === 404) {
      return { allowed: true, current: 0, limit: -1 };
    }
    throw error;
  }
};

/**
 * Check if error is a package limit error
 * @param {Error} error - Error object
 * @returns {boolean} True if package limit error
 */
export const isPackageLimitError = (error) => {
  return (
    error?.data?.code === "PACKAGE_LIMIT_EXCEEDED" ||
    error?.status === 403 ||
    error?.message?.includes("limit")
  );
};

const packageService = {
  validateEventCreation,
  checkGuestLimit,
  checkModeratorLimit,
  isPackageLimitError,
};

export default packageService;

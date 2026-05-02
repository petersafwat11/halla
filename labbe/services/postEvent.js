/**
 * Post-Event Service
 * API calls for post-event content - guest interactions and content viewing
 */

import apiClient from "./apiClient";
import Cookies from "js-cookie";

/**
 * Get guest session token from cookies (separate from main auth)
 */
const getGuestToken = () => {
  if (typeof window !== "undefined") {
    return Cookies.get("guestToken") || null;
  }
  return null;
};

/**
 * Set guest session token in cookie
 */
const setGuestToken = (token) => {
  if (typeof window !== "undefined") {
    Cookies.set("guestToken", token, {
      expires: 7,
      path: "/",
      sameSite: "Lax",
    });
  }
};

/**
 * Clear guest session token
 */
const clearGuestToken = () => {
  if (typeof window !== "undefined") {
    Cookies.remove("guestToken", { path: "/" });
  }
};

/**
 * Store event ID for session
 */
const setEventId = (eventId) => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("postEventId", eventId);
  }
};

/**
 * Get stored event ID
 */
const getEventId = () => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("postEventId");
  }
  return null;
};

/**
 * Post-Event Service API
 */
export const postEventService = {
  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Validate access token
   * @param {string} token - Access token from URL
   */
  validateToken: async (token) => {
    const response = await apiClient.get(
      `/post-event/validate?token=${encodeURIComponent(token)}`
    );

    // Store session token and event ID if validation successful
    if (response.data?.sessionToken) {
      setGuestToken(response.data.sessionToken);
    }
    if (response.data?.event?._id) {
      setEventId(response.data.event._id);
    }

    return response;
  },

  /**
   * Logout - clear guest session
   */
  logout: () => {
    clearGuestToken();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("postEventId");
    }
  },

  /**
   * Check if guest is authenticated
   */
  isAuthenticated: () => {
    return !!getGuestToken();
  },

  /**
   * Get current event ID
   */
  getCurrentEventId: getEventId,

  // ============================================
  // CONTENT
  // ============================================

  /**
   * Get post-event content
   * @param {string} eventId - Event ID
   */
  getContent: async (eventId) => {
    return apiClient.get(`/post-event/${eventId}/content`, {
      token: getGuestToken(),
    });
  },

  // ============================================
  // INTERACTIONS
  // ============================================

  /**
   * Toggle like on a post
   * @param {string} eventId - Event ID
   * @param {string} postId - Post ID
   */
  toggleLike: async (eventId, postId) => {
    return apiClient.post(`/post-event/${eventId}/posts/${postId}/like`, null, {
      token: getGuestToken(),
    });
  },

  /**
   * Add comment to a post
   * @param {string} eventId - Event ID
   * @param {string} postId - Post ID
   * @param {string} text - Comment text
   * @param {File[]} images - Optional image files
   */
  addComment: async (eventId, postId, text, images = []) => {
    const formData = new FormData();
    formData.append("text", text);

    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append("images", image);
      });
    }

    return apiClient.post(
      `/post-event/${eventId}/posts/${postId}/comments`,
      formData,
      { token: getGuestToken() }
    );
  },

  /**
   * Get comments for a post
   * @param {string} eventId - Event ID
   * @param {string} postId - Post ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  getComments: async (eventId, postId, page = 1, limit = 20) => {
    return apiClient.get(
      `/post-event/${eventId}/posts/${postId}/comments?page=${page}&limit=${limit}`,
      { token: getGuestToken() }
    );
  },
};

// Export token utilities for external use
export const guestTokenUtils = {
  getToken: getGuestToken,
  setToken: setGuestToken,
  clearToken: clearGuestToken,
  getEventId,
  setEventId,
};

export default postEventService;

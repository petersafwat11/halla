/**
 * Settings Service Functions
 * Helper functions and API calls for user settings management
 */

import apiClient from "./apiClient";

/**
 * Settings API functions
 */
export const settingsService = {
  /**
   * Get user profile information
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} User profile data
   */
  getProfile: async (token = null) => {
    return apiClient.get("/users/profile", { token });
  },

  /**
   * Update user profile information
   * @param {Object} profileData - Profile data to update
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated profile
   */
  updateProfile: async (profileData, token = null) => {
    return apiClient.patch("/users/profile", profileData, { token });
  },

  /**
   * Update user password
   * @param {Object} passwordData - Password data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Result
   */
  updatePassword: async (passwordData, token = null) => {
    return apiClient.patch("/users/password", passwordData, { token });
  },

  /**
   * Get notification preferences (role-aware)
   * Works for all roles: host, vendor, admin, moderator, whitelabel
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Notification preferences { appNotifications, emailNotifications }
   */
  getNotificationPreferences: async (token = null) => {
    return apiClient.get("/users/notification-preferences", { token });
  },

  /**
   * Update notification preferences (role-aware)
   * Works for all roles: host, vendor, admin, moderator, whitelabel
   * @param {Object} preferences - Notification preferences { appNotifications, emailNotifications }
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Updated preferences
   */
  updateNotificationPreferences: async (preferences, token = null) => {
    // Send in component format (appNotifications, emailNotifications)
    // Backend accepts both formats
    return apiClient.patch("/users/notification-preferences", preferences, {
      token,
    });
  },

  /**
   * Upload profile avatar
   * @param {File} file - Avatar image file
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Upload result
   */
  uploadAvatar: async (file, token = null) => {
    const formData = new FormData();
    formData.append("avatar", file);

    return apiClient.patch("/users/profile", formData, { token });
  },

  /**
   * Delete user account
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Deletion result
   */
  deleteAccount: async (token = null) => {
    return apiClient.delete("/users/profile", { token });
  },

  /**
   * Verify email with code
   * @param {string} code - Email verification code
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Verification result
   */
  verifyEmail: async (code, token = null) => {
    return apiClient.post("/auth/verify-email", { code }, { token });
  },

  /**
   * Resend email verification code
   * @param {string} [token] - Optional auth token
   * @returns {Promise<Object>} Result
   */
  resendEmailVerification: async (token = null) => {
    return apiClient.post("/auth/send-verification-code", {}, { token });
  },
};

/**
 * Helper functions for settings management
 */
export const settingsHelpers = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number format (Saudi Arabia)
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Is valid
   */
  isValidPhone: (phone) => {
    const phoneRegex = /^(\+966|966|0)?5[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/[\s\-]/g, ""));
  },

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with details
   */
  validatePassword: (password) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isValid = minLength && hasUppercase && hasLowercase && hasNumber;

    return {
      isValid,
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      strength: [
        minLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecialChar,
      ].filter(Boolean).length,
    };
  },

  /**
   * Format phone number for display
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber: (phone) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");

    // Saudi format: +966 5X XXX XXXX
    if (cleaned.startsWith("966")) {
      const number = cleaned.slice(3);
      return `+966 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(
        5
      )}`;
    }

    if (cleaned.startsWith("0")) {
      const number = cleaned.slice(1);
      return `+966 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(
        5
      )}`;
    }

    return phone;
  },

  /**
   * Get user initials from name
   * @param {string} name - User name
   * @returns {string} Initials (max 2 characters)
   */
  getInitials: (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  },

  /**
   * Get notification settings structure with defaults
   * @returns {Object} Default notification settings
   */
  getDefaultNotificationSettings: () => ({
    email: {
      eventReminders: true,
      guestUpdates: true,
      paymentAlerts: true,
      marketingEmails: false,
      weeklyDigest: true,
    },
    push: {
      eventReminders: true,
      guestUpdates: true,
      paymentAlerts: true,
      chatMessages: true,
    },
    sms: {
      eventReminders: false,
      urgentAlerts: true,
    },
  }),

  /**
   * Merge notification settings with defaults
   * @param {Object} settings - User's notification settings
   * @returns {Object} Merged settings with defaults
   */
  mergeNotificationSettings: (settings) => {
    const defaults = settingsHelpers.getDefaultNotificationSettings();

    return {
      email: { ...defaults.email, ...settings?.email },
      push: { ...defaults.push, ...settings?.push },
      sms: { ...defaults.sms, ...settings?.sms },
    };
  },
};

export default settingsService;

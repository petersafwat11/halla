import { API_BASE_URL, ENDPOINTS } from "../config/api";

/**
 * Get user profile
 * @param {string} token - Auth token
 * @returns {Promise<{status: string, user: Object}>}
 */
export const getProfileAPI = async (token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USERS.PROFILE}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to get profile");
  }
  return data;
};

/**
 * Update user profile
 * @param {Object} data - Profile data to update
 * @param {string} token - Auth token
 * @returns {Promise<{status: string, user: Object}>}
 */
export const updateProfileAPI = async (data, token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USERS.UPDATE_PROFILE}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.message || "Failed to update profile");
  }
  return responseData;
};

/**
 * Upload profile image
 * @param {Object} imageFile - Image file object
 * @param {string} token - Auth token
 * @returns {Promise<{status: string, user: Object}>}
 */
export const uploadProfileImageAPI = async (imageFile, token) => {
  const formData = new FormData();
  formData.append("avatar", imageFile);

  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USERS.UPDATE_PROFILE}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to upload profile image");
  }
  return data;
};

/**
 * Change password
 * @param {Object} passwordData - { oldPassword, newPassword } or (oldPassword, newPassword)
 * @param {string} token - Auth token
 * @returns {Promise<{status: string, message: string}>}
 */
export const changePasswordAPI = async (passwordData, token) => {
  // Support both object and positional args
  let currentPassword, newPassword;
  if (typeof passwordData === 'object') {
    currentPassword = passwordData.oldPassword || passwordData.currentPassword;
    newPassword = passwordData.newPassword;
  } else {
    currentPassword = passwordData;
    newPassword = token;
    token = arguments[2];
  }

  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AUTH.UPDATE_PASSWORD}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
      passwordConfirm: newPassword,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to change password");
  }
  return data;
};

/**
 * Delete user account
 * @param {string} token - Auth token
 */
export const deleteAccountAPI = async (token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USERS.PROFILE}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete account");
  }
  return data;
};

/**
 * Update host account data (uses users/profile endpoint)
 */
export const updateAccountAPI = async (data, token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USERS.UPDATE_PROFILE}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.message || "Failed to update account");
  }
  return responseData;
};

/**
 * Get notification preferences
 */
export const getNotificationPreferencesAPI = async (token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USERS.NOTIFICATION_SETTINGS}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to get notification preferences");
  }
  return data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferencesAPI = async (data, token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.USERS.NOTIFICATION_SETTINGS}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.message || "Failed to update notification preferences");
  }
  return responseData;
};

/**
 * Send email verification code
 */
export const sendEmailVerificationCodeAPI = async (token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AUTH.SEND_VERIFICATION_CODE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to send verification code");
  }
  return data;
};

/**
 * Verify email with code
 */
export const verifyEmailAPI = async (code, token) => {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.AUTH.VERIFY_EMAIL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify email");
  }
  return data;
};

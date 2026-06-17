/**
 * Cookie Utility Functions
 * Client-side cookie management utilities
 */

export const cookieUtils = {
  /**
   * Set a cookie with optional expiry
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} days - Days until expiry (default: 7)
   */
  setCookie: (name, value, days = 7) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  },

  /**
   * Get a cookie value by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null if not found
   */
  getCookie: (name) => {
    if (typeof window === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },

  /**
   * Delete a cookie by name
   * @param {string} name - Cookie name
   */
  deleteCookie: (name) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  },

  /**
   * Clear all authentication cookies
   */
  clearAuthCookies: () => {
    cookieUtils.deleteCookie("jwt");
    cookieUtils.deleteCookie("token");
    cookieUtils.deleteCookie("userType");
  },

  /**
   * Get auth token from cookies
   * @returns {string|null} Token or null
   */
  getToken: () => {
    return cookieUtils.getCookie("token");
  },
};

export default cookieUtils;

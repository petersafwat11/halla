/**
 * Cookie Utility Functions
 * Client-side cookie management utilities using js-cookie
 */

import Cookies from "js-cookie";

export const cookieUtils = {
  /**
   * Set a cookie with optional expiry
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} days - Days until expiry (default: 7)
   */
  setCookie: (name, value, days = 7) => {
    Cookies.set(name, value, { expires: days, path: "/", sameSite: "lax" });
  },

  /**
   * Get a cookie value by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null if not found
   */
  getCookie: (name) => {
    return Cookies.get(name) || null;
  },

  /**
   * Delete a cookie by name
   * @param {string} name - Cookie name
   */
  deleteCookie: (name) => {
    Cookies.remove(name, { path: "/", sameSite: "lax" });
  },

  /**
   * Clear all authentication cookies
   */
  clearAuthCookies: () => {
    cookieUtils.deleteCookie("jwt");
    cookieUtils.deleteCookie("token");
    cookieUtils.deleteCookie("userType");
    cookieUtils.deleteCookie("profileCompleted");
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

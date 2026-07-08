/**
 * Staff portal session token helpers.
 *
 * The staff session token is stored in a JS-readable cookie, intentionally,
 * consistent with the main app token. A future cookie-hardening pass should
 * switch both to HttpOnly, backend-issued cookies (documented future-
 * hardening item, §7.1).
 */

import Cookies from "js-cookie";

const COOKIE_NAME = "staffToken";

export const getStaffToken = () => {
  if (typeof window !== "undefined") {
    return Cookies.get(COOKIE_NAME) || null;
  }
  return null;
};

export const setStaffToken = (token) => {
  if (typeof window !== "undefined") {
    Cookies.set(COOKIE_NAME, token, {
      expires: 1,
      path: "/",
      sameSite: "Lax",
    });
  }
};

export const clearStaffToken = () => {
  if (typeof window !== "undefined") {
    Cookies.remove(COOKIE_NAME, { path: "/" });
  }
};

export const isStaffAuthenticated = () => !!getStaffToken();

/**
 * Build an axios config that attaches the staff Bearer token. Returns an
 * empty object when no token is stored, so callers can spread it
 * unconditionally.
 */
export const staffAuthConfig = () => {
  const token = getStaffToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

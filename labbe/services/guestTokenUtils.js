/**
 * Guest session token helpers for the public post-event guest flow.
 * Stores the session token in a cookie and the eventId in sessionStorage so
 * the page can resume after refresh without a new `?token=` in the URL.
 */

import Cookies from "js-cookie";

const COOKIE_NAME = "guestToken";
const STORAGE_KEY = "postEventId";

const getToken = () => {
  if (typeof window === "undefined") return null;
  return Cookies.get(COOKIE_NAME) || null;
};

const setToken = (token) => {
  if (typeof window === "undefined") return;
  Cookies.set(COOKIE_NAME, token, {
    expires: 7,
    path: "/",
    sameSite: "Lax",
  });
};

const clearToken = () => {
  if (typeof window === "undefined") return;
  Cookies.remove(COOKIE_NAME, { path: "/" });
};

const setEventId = (eventId) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, eventId);
};

const getEventId = () => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
};

const clearEventId = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
};

export const guestTokenUtils = {
  getToken,
  setToken,
  clearToken,
  getEventId,
  setEventId,
  clearEventId,
};

/**
 * Post-event service (guest-side).
 *
 * Uses `fetchWithTimeout` because these calls authenticate with a
 * per-event guest session token (NOT the host's user JWT). A 401 here
 * means the guest session expired and the guest needs to re-validate
 * the link — it should not trigger the user-token refresh flow.
 *
 * On non-2xx responses the helper throws an Error with `status` and
 * `data` attached so callers can read `error.data.reason` for the 410
 * structured error body.
 */

import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { fetchWithTimeout } from "./http";

const _request = async (url, init, errorMessage) => {
  const response = await fetchWithTimeout(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || errorMessage);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

const _withSession = (sessionToken) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionToken}`,
});

export const validatePostEventToken = (token) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.VALIDATE_TOKEN}?token=${encodeURIComponent(token)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
    "Invalid or expired token"
  );

export const getPostEventContent = (eventId, sessionToken) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.CONTENT(eventId)}`,
    { method: "GET", headers: _withSession(sessionToken) },
    "Failed to load content"
  );

export const togglePostEventLike = (eventId, postId, sessionToken) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.TOGGLE_LIKE(eventId, postId)}`,
    { method: "POST", headers: _withSession(sessionToken) },
    "Failed to toggle like"
  );

export const addPostEventComment = (eventId, postId, formData, sessionToken) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.ADD_COMMENT(eventId, postId)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: formData,
    },
    "Failed to add comment"
  );

export const getPostEventComments = (
  eventId,
  postId,
  params = {},
  sessionToken
) => {
  const { page = 1, limit = 20 } = params;
  return _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.GET_COMMENTS(eventId, postId)}?page=${page}&limit=${limit}`,
    { method: "GET", headers: _withSession(sessionToken) },
    "Failed to load comments"
  );
};

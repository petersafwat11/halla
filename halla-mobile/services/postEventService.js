/**
 * Post-event service (guest-side).
 *
 * Phase 4 W0-AUTH: routed through `fetchWithTimeout` because these
 * calls use a per-event guest session token (NOT the user's JWT). They
 * shouldn't trigger `useAuthStore.refreshTokens()` on 401 — a 401 here
 * means the guest session expired and the guest needs to re-validate
 * the link.
 */

import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { fetchWithTimeout } from "./apiClient";

const _request = async (url, init, errorMessage) => {
  const response = await fetchWithTimeout(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

/**
 * Validate a guest access token for post-event content. No auth header
 * — token is in the query string.
 */
export const validatePostEventToken = async (token) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.VALIDATE_TOKEN}?token=${encodeURIComponent(token)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
    "Invalid or expired token"
  );

const _withSession = (sessionToken) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionToken}`,
});

export const getPostEventContent = async (eventId, sessionToken) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.CONTENT(eventId)}`,
    { method: "GET", headers: _withSession(sessionToken) },
    "Failed to load content"
  );

export const togglePostEventLike = async (eventId, postId, sessionToken) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.TOGGLE_LIKE(eventId, postId)}`,
    { method: "POST", headers: _withSession(sessionToken) },
    "Failed to toggle like"
  );

export const addPostEventComment = async (eventId, postId, text, sessionToken) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.ADD_COMMENT(eventId, postId)}`,
    {
      method: "POST",
      headers: _withSession(sessionToken),
      body: JSON.stringify({ text }),
    },
    "Failed to add comment"
  );

export const getPostEventComments = async (eventId, postId, sessionToken, page = 1) =>
  _request(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.GET_COMMENTS(eventId, postId)}?page=${page}&limit=20`,
    { method: "GET", headers: _withSession(sessionToken) },
    "Failed to load comments"
  );

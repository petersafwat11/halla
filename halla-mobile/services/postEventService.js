import { API_BASE_URL, ENDPOINTS } from "../config/api";

/**
 * Validate a guest access token for post-event content
 * No auth required — token is from a shareable link
 * @param {string} token - Guest access token from URL/QR
 * @returns {Promise<{valid, guest: {_id, name}, event: {_id, title}, sessionToken}>}
 */
export const validatePostEventToken = async (token) => {
  const url = `${API_BASE_URL}${ENDPOINTS.POST_EVENT.VALIDATE_TOKEN}?token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Invalid or expired token");
  return data;
};

/**
 * Fetch post-event content for a guest
 * @param {string} eventId
 * @param {string} sessionToken - From validatePostEventToken
 * @returns {Promise<Object>} Content with posts array
 */
export const getPostEventContent = async (eventId, sessionToken) => {
  const response = await fetch(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.CONTENT(eventId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load content");
  return data;
};

/**
 * Toggle like on a post
 * @param {string} eventId
 * @param {string} postId
 * @param {string} sessionToken
 * @returns {Promise<{liked: boolean, likesCount: number}>}
 */
export const togglePostEventLike = async (eventId, postId, sessionToken) => {
  const response = await fetch(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.TOGGLE_LIKE(eventId, postId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to toggle like");
  return data;
};

/**
 * Add a comment to a post
 * @param {string} eventId
 * @param {string} postId
 * @param {string} text
 * @param {string} sessionToken
 * @returns {Promise<{comment, commentsCount}>}
 */
export const addPostEventComment = async (eventId, postId, text, sessionToken) => {
  const response = await fetch(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.ADD_COMMENT(eventId, postId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ text }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add comment");
  return data;
};

/**
 * Get comments for a post (paginated)
 * @param {string} eventId
 * @param {string} postId
 * @param {string} sessionToken
 * @param {number} page
 * @returns {Promise<{comments, pagination}>}
 */
export const getPostEventComments = async (eventId, postId, sessionToken, page = 1) => {
  const response = await fetch(
    `${API_BASE_URL}${ENDPOINTS.POST_EVENT.GET_COMMENTS(eventId, postId)}?page=${page}&limit=20`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load comments");
  return data;
};

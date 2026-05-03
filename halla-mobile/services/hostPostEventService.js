/**
 * Host post-event service.
 *
 * Phase 4 W0-AUTH: routed through `apiFetch` for token attach, 401
 * refresh, and the 30 s timeout. Token args accepted but ignored.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const request = async (path, _legacyToken, options = {}) => {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await apiFetch(path, {
    method: options.method || "GET",
    body:
      options.body && !isFormData && typeof options.body === "string"
        ? JSON.parse(options.body)
        : options.body,
    headers: options.headers,
    // Uploads can take longer than 30 s on slow links — give them a bit more.
    timeoutMs: isFormData ? 60 * 1000 : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const getHostPostEventContent = (eventId, token) =>
  request(ENDPOINTS.POST_EVENT.HOST_CONTENT(eventId), token);

export const uploadPostEventPhotos = (eventId, formData, token) =>
  request(ENDPOINTS.POST_EVENT.UPLOAD_PHOTOS(eventId), token, {
    method: "POST",
    body: formData,
  });

export const updateThankYouMessage = (eventId, message, token) =>
  request(ENDPOINTS.POST_EVENT.UPDATE_THANK_YOU(eventId), token, {
    method: "PATCH",
    body: { message },
  });

export const deletePostEventPhoto = (eventId, photoId, token) =>
  request(ENDPOINTS.POST_EVENT.DELETE_PHOTO(eventId, photoId), token, {
    method: "DELETE",
  });

export const publishPostEventContent = (eventId, token) =>
  request(ENDPOINTS.POST_EVENT.PUBLISH(eventId), token, { method: "POST" });

export const generatePostEventTokens = (eventId, filter = "attended", token) =>
  request(ENDPOINTS.POST_EVENT.GENERATE_TOKENS(eventId), token, {
    method: "POST",
    body: { filter },
  });

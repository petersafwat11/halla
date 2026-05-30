/**
 * Host post-event service.
 *
 * Routed through `apiFetch` so each call inherits the in-memory access
 * token, the 401-refresh interceptor, and the default 30 s timeout.
 * Multipart uploads bump the timeout to 60 s.
 */

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

const _request = async (path, options = {}) => {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await apiFetch(path, {
    method: options.method || "GET",
    body: options.body,
    headers: options.headers,
    timeoutMs: isFormData ? 60 * 1000 : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const getHostPostEventContent = (eventId) =>
  _request(ENDPOINTS.POST_EVENT.HOST_CONTENT(eventId));

export const uploadPostEventMedia = (eventId, formData) =>
  _request(ENDPOINTS.POST_EVENT.UPLOAD_MEDIA(eventId), {
    method: "POST",
    body: formData,
  });

export const deletePostEventMedia = (eventId, mediaId) =>
  _request(ENDPOINTS.POST_EVENT.DELETE_MEDIA(eventId, mediaId), {
    method: "DELETE",
  });

export const updateThankYouMessage = (eventId, body) =>
  _request(ENDPOINTS.POST_EVENT.UPDATE_THANK_YOU(eventId), {
    method: "PATCH",
    body,
  });

export const updatePostEventMessagingTemplate = (eventId, body) =>
  _request(ENDPOINTS.POST_EVENT.UPDATE_MESSAGING_TEMPLATE(eventId), {
    method: "PATCH",
    body,
  });

export const publishPostEventContent = (eventId) =>
  _request(ENDPOINTS.POST_EVENT.PUBLISH(eventId), { method: "POST" });

export const unpublishPostEventContent = (eventId) =>
  _request(ENDPOINTS.POST_EVENT.UNPUBLISH(eventId), { method: "PATCH" });

export const generatePostEventTokens = (eventId, body) =>
  _request(ENDPOINTS.POST_EVENT.GENERATE_TOKENS(eventId), {
    method: "POST",
    body,
  });

export const sendPostEventAccessLinks = (eventId, body) =>
  _request(ENDPOINTS.POST_EVENT.SEND_ACCESS_LINKS(eventId), {
    method: "POST",
    body,
  });

/**
 * Mobile auth error utilities.
 *
 * Phase 2 unification: `ApiError` and `authErrorMessage` now live in
 * `@halla/shared/errors`. This file keeps mobile-specific HTTP helpers
 * (`requestJson`, `postJson`, `postForm`, `patchJson`) that wrap
 * `fetchWithTimeout` — fetch-specific code that can't move into shared.
 */

import { fetchWithTimeout } from "./apiClient";
import { API_BASE_URL } from "../config/api";
import {
  ApiError,
  apiErrorFromResponse,
  apiErrorFromTransport,
  authErrorMessage as sharedAuthErrorMessage,
} from "@halla/shared/errors";

export { ApiError };

const buildUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Issue an HTTP request and return parsed JSON. Throws `ApiError` on
 * any non-2xx, timeout, or network failure — never `Error("foo")`.
 */
export const requestJson = async (path, init = {}) => {
  let response;
  try {
    response = await fetchWithTimeout(buildUrl(path), init);
  } catch (err) {
    throw apiErrorFromTransport(err);
  }

  const data = await safeJson(response);

  if (!response.ok) {
    throw apiErrorFromResponse({ status: response.status, data: data || {} });
  }
  return data;
};

export const postJson = (path, body, init = {}) =>
  requestJson(path, {
    ...init,
    method: init.method || "POST",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(body),
  });

export const postForm = (path, formData, init = {}) =>
  requestJson(path, {
    ...init,
    method: init.method || "POST",
    body: formData,
  });

export const patchJson = (path, body, init = {}) =>
  requestJson(path, {
    ...init,
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(body),
  });

export const authErrorMessage = sharedAuthErrorMessage;

export default { ApiError, requestJson, postJson, postForm, patchJson, authErrorMessage };

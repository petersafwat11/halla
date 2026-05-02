/**
 * Mobile API client.
 *
 * Phase 1a: thin wrapper around `fetch` that
 *   1) attaches the in-memory access token from the auth store, and
 *   2) on 401, calls `useAuthStore.refreshTokens()` once and replays the
 *      request with the fresh token.
 *
 * Existing services still use raw `fetch` — they continue to work but a
 * 401 will fail the call until the user restarts the app. Phase 4 (mobile
 * parity) is responsible for migrating those services to `apiFetch`. New
 * mobile code should call this wrapper.
 *
 * Usage:
 *
 *     import { apiFetch } from "../services/apiClient";
 *     const res = await apiFetch("/dashboard/host", { method: "GET" });
 *     const json = await res.json();
 *
 * The wrapper does NOT throw on non-2xx — it returns the Response so
 * callers can inspect `response.ok` and parse error bodies as before.
 */

import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../stores/authStore";

let _refreshPromise = null;
const _refreshOnce = async () => {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      return await useAuthStore.getState().refreshTokens();
    } finally {
      Promise.resolve().then(() => {
        _refreshPromise = null;
      });
    }
  })();
  return _refreshPromise;
};

/**
 * @param {string} path  - Path relative to API_BASE_URL, leading slash optional
 * @param {Object} [options]
 * @param {string} [options.method="GET"]
 * @param {Object|FormData|null} [options.body]
 * @param {Object} [options.headers]
 * @param {boolean} [options.skipAuth=false] - Don't attach Authorization or refresh
 * @returns {Promise<Response>}
 */
export const apiFetch = async (path, options = {}) => {
  const { method = "GET", body, headers = {}, skipAuth = false } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const buildInit = (token) => ({
    method,
    headers: {
      ...(!isFormData && body ? { "Content-Type": "application/json" } : {}),
      ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined && body !== null
      ? { body: isFormData ? body : JSON.stringify(body) }
      : {}),
  });

  const initialToken = useAuthStore.getState().token;
  let response = await fetch(url, buildInit(initialToken));

  if (response.status === 401 && !skipAuth && !path.startsWith("/auth/refresh")) {
    if (isFormData) {
      // FormData bodies are streams and cannot be re-read after the first
      // fetch consumed them. Force a fresh access token but the caller has
      // to retry uploads themselves.
      await _refreshOnce();
      return response;
    }
    const fresh = await _refreshOnce();
    if (fresh) {
      response = await fetch(url, buildInit(fresh));
    }
  }

  return response;
};

export default apiFetch;

import { apiFetch } from "./apiClient";

/**
 * Events calls flow through `apiFetch`, which auto-refreshes the access
 * token on 401 and retries. Caller-supplied `token` arg is ignored —
 * apiFetch sources the in-memory token from the auth store.
 *
 * This thin wrapper accepts an absolute path (relative to API_BASE_URL)
 * and is the single entry point for every events service call. Always
 * pass `ENDPOINTS.EVENTS.*(...)` (or another ENDPOINTS subtree) — never
 * a hardcoded template literal.
 */
export const authenticatedFetch = async (path, _legacyToken, options = {}) => {
  const fetchOpts = {
    method: options.method || "GET",
    headers: options.headers || {},
  };
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "string") {
      try {
        fetchOpts.body = JSON.parse(options.body);
      } catch (_) {
        fetchOpts.body = options.body;
      }
    } else {
      fetchOpts.body = options.body;
    }
  }
  const response = await apiFetch(path, fetchOpts);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }
  return data;
};

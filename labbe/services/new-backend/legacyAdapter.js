/**
 * Legacy `apiClient` shape (`.get / .post / .patch / .put / .delete`,
 * `.buildQueryString`) implemented on top of the canonical axios-based
 * `apiRequest` from `./apiClient`. Phase 3 of the unification deletes
 * the old fetch-based `services/apiClient.js`; the three remaining
 * consumers (`notification.js`, `staff.js`, `adminDashboard.js`) import
 * this adapter so their internals don't need rewriting.
 *
 * Phase 5/8 can migrate each consumer to call `apiRequest` directly and
 * then this adapter can be deleted.
 */
import { apiRequest } from "./apiClient";
import { ApiError } from "@halla/shared/errors";

// Legacy callers used `APIError` (capital P) — re-export the shared
// `ApiError` under that name so `instanceof APIError` checks still work.
export const APIError = ApiError;

const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : "";
};

/**
 * Split a URL of the form "/path?a=1&b=2" into `{ path, params }` so the
 * axios `params` config can serialize them (and stay consistent with how
 * other call sites that pass `params:` work).
 */
const splitQuery = (rawPath) => {
  const idx = rawPath.indexOf("?");
  if (idx === -1) return { path: rawPath, params: undefined };
  const path = rawPath.slice(0, idx);
  const search = new URLSearchParams(rawPath.slice(idx + 1));
  const params = {};
  for (const [k, v] of search.entries()) params[k] = v;
  return { path, params };
};

const request = async (method, rawPath, body, options = {}) => {
  const { path, params } = splitQuery(rawPath);
  const config = { ...(options.config || {}) };

  // Legacy callers (staff portal) pass `options.token` for a Bearer
  // session token that lives outside the main HttpOnly auth cookies.
  // Map it onto the axios `headers` config.
  if (options.token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${options.token}`,
    };
  }

  // Legacy callers pass FormData directly as the body; the axios layer
  // detects the FormData instance and lets the browser set the boundary.
  const data =
    body instanceof FormData
      ? body
      : body !== undefined
        ? body
        : undefined;

  return apiRequest({ method, path, data, params, config });
};

export const legacyClientAdapter = {
  buildQueryString,
  get: (path, options) => request("GET", path, undefined, options),
  post: (path, body, options) => request("POST", path, body, options),
  patch: (path, body, options) => request("PATCH", path, body, options),
  put: (path, body, options) => request("PUT", path, body, options),
  delete: (path, options) => request("DELETE", path, undefined, options),
};

export default legacyClientAdapter;

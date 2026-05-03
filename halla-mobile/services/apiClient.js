/**
 * Mobile API client.
 *
 * Phase 1a: thin wrapper around `fetch` that
 *   1) attaches the in-memory access token from the auth store, and
 *   2) on 401, calls `useAuthStore.refreshTokens()` once and replays the
 *      request with the fresh token.
 *
 * Phase 4 (W0-AUTH): adds a default 30 s request timeout via
 * `AbortController`, surfaces it to callers via `options.timeoutMs`, and
 * preserves any caller-supplied `options.signal`. The intent is that
 * every authenticated request on mobile inherits the same upper bound
 * without each service file re-implementing it.
 *
 * Existing services still using raw `fetch` are migrated in W0-AUTH so
 * they share the auth interceptor + timeout. New mobile code MUST call
 * `apiFetch`.
 *
 * Usage:
 *
 *     import { apiFetch } from "../services/apiClient";
 *     const res = await apiFetch("/dashboard/host", { method: "GET" });
 *     const json = await res.json();
 *
 * The wrapper does NOT throw on non-2xx — it returns the Response so
 * callers can inspect `response.ok` and parse error bodies as before.
 *
 * Timeout: when the request exceeds `timeoutMs` (default 30 s) the
 * underlying `fetch` is aborted and `apiFetch` throws an Error with
 * `name === "TimeoutError"`. Pass `timeoutMs: 0` (or `null`) to disable
 * the timeout for a specific call (e.g. long-running uploads). Callers
 * may also pass their own `AbortSignal` via `options.signal` — both
 * abort sources are honored.
 */

import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../stores/authStore";

export const DEFAULT_TIMEOUT_MS = 30 * 1000;

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
 * Build an AbortController whose abort is triggered by either the
 * timeout firing or the caller's own signal aborting. Returns
 * `{ signal, cancel }` so the caller can clean up the timer when the
 * request completes.
 */
const _makeTimeoutController = (timeoutMs, externalSignal) => {
  const controller = new AbortController();
  let timer = null;
  let externalListener = null;

  const cleanup = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    if (externalListener && externalSignal) {
      externalSignal.removeEventListener("abort", externalListener);
      externalListener = null;
    }
  };

  if (typeof timeoutMs === "number" && timeoutMs > 0) {
    timer = setTimeout(() => {
      const err = new Error(`Request timed out after ${timeoutMs} ms`);
      err.name = "TimeoutError";
      try {
        controller.abort(err);
      } catch (_) {
        controller.abort();
      }
    }, timeoutMs);
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      try {
        controller.abort(externalSignal.reason);
      } catch (_) {
        controller.abort();
      }
    } else {
      externalListener = () => {
        try {
          controller.abort(externalSignal.reason);
        } catch (_) {
          controller.abort();
        }
      };
      externalSignal.addEventListener("abort", externalListener);
    }
  }

  return { signal: controller.signal, cleanup };
};

/**
 * @param {string} path  - Path relative to API_BASE_URL, leading slash optional
 * @param {Object} [options]
 * @param {string} [options.method="GET"]
 * @param {Object|FormData|null} [options.body]
 * @param {Object} [options.headers]
 * @param {boolean} [options.skipAuth=false] - Don't attach Authorization or refresh
 * @param {number|null} [options.timeoutMs=DEFAULT_TIMEOUT_MS] - Request timeout in ms; 0/null disables
 * @param {AbortSignal} [options.signal] - Caller-supplied abort signal
 * @returns {Promise<Response>}
 */
export const apiFetch = async (path, options = {}) => {
  const {
    method = "GET",
    body,
    headers = {},
    skipAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
  } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const buildInit = (token, signal) => ({
    method,
    headers: {
      ...(!isFormData && body ? { "Content-Type": "application/json" } : {}),
      ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined && body !== null
      ? { body: isFormData ? body : JSON.stringify(body) }
      : {}),
    ...(signal ? { signal } : {}),
  });

  let initialToken = useAuthStore.getState().token;

  // Phase 4 review fix — if the access token is missing on a non-public
  // request, try to refresh BEFORE issuing a guaranteed-401 request.
  // Without this, every authenticated call after a session restoration
  // gap would burn an extra round-trip waiting for the 401 → refresh
  // path to kick in. We only refresh if a refresh token is present
  // (`refreshTokens()` returns null otherwise, in which case the call
  // proceeds unauthenticated and the backend will reject it cleanly).
  if (!initialToken && !skipAuth && !path.startsWith("/auth/refresh")) {
    const refreshed = await _refreshOnce();
    if (refreshed) initialToken = refreshed;
  }

  const firstAttempt = _makeTimeoutController(timeoutMs, externalSignal);
  let response;
  try {
    response = await fetch(url, buildInit(initialToken, firstAttempt.signal));
  } catch (err) {
    firstAttempt.cleanup();
    if (err && err.name === "AbortError") {
      const timeoutErr = new Error(
        `Request timed out after ${timeoutMs} ms (${method} ${path})`
      );
      timeoutErr.name = "TimeoutError";
      throw timeoutErr;
    }
    throw err;
  }
  firstAttempt.cleanup();

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
      const retryAttempt = _makeTimeoutController(timeoutMs, externalSignal);
      try {
        response = await fetch(url, buildInit(fresh, retryAttempt.signal));
      } catch (err) {
        retryAttempt.cleanup();
        if (err && err.name === "AbortError") {
          const timeoutErr = new Error(
            `Request timed out after ${timeoutMs} ms (${method} ${path}, post-refresh)`
          );
          timeoutErr.name = "TimeoutError";
          throw timeoutErr;
        }
        throw err;
      }
      retryAttempt.cleanup();
    }
  }

  return response;
};

/**
 * Plain fetch with the same timeout semantics as `apiFetch` but without
 * the auth interceptor. Useful for endpoints that take their own session
 * token (staff portal, post-event guest tokens) and shouldn't trigger a
 * user-token refresh on 401.
 */
export const fetchWithTimeout = async (url, init = {}, opts = {}) => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal } = opts;
  const { signal: callerSignalFromInit, ...restInit } = init;
  const merged = _makeTimeoutController(timeoutMs, externalSignal || callerSignalFromInit);
  try {
    return await fetch(url, { ...restInit, signal: merged.signal });
  } catch (err) {
    if (err && err.name === "AbortError") {
      const timeoutErr = new Error(`Request timed out after ${timeoutMs} ms (${url})`);
      timeoutErr.name = "TimeoutError";
      throw timeoutErr;
    }
    throw err;
  } finally {
    merged.cleanup();
  }
};

export default apiFetch;

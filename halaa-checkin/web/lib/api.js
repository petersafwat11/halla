/**
 * ApiError represents a structured error returned from the backend check-in API.
 */
export class ApiError extends Error {
  constructor({ status, code, message, fieldErrors = {}, requestId = null, details = {} }) {
    super(message || 'An error occurred');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'UNKNOWN';
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
    this.details = details;
  }
}

let currentCsrfToken = null;

let unauthorizedHandler = null;

/**
 * Register a central 401 handler (SessionProvider). Called once per
 * unauthenticated response so the app can clear private data, stop camera
 * and enter reauthentication (F10).
 * @param {(info: { status: number, code: string }) => void | null} fn
 */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

function notifyUnauthorized(info) {
  try {
    unauthorizedHandler?.(info);
  } catch {
    // Never break API flow on handler errors
  }
}

/** Application request deadline in ms (F09: hung requests must not hang forever). */
export const API_REQUEST_TIMEOUT_MS = 20000;

/**
 * Set the current session CSRF token for mutating requests.
 * @param {string | null} token
 */
export function setCsrfToken(token) {
  currentCsrfToken = token;
}

/**
 * Get the current CSRF token.
 * @returns {string | null}
 */
export function getCsrfToken() {
  return currentCsrfToken;
}

export const API_BASE = '/api/checkin/v1';

/**
 * Core API fetch wrapper.
 * @param {string} endpoint e.g. '/auth/session' or '/events'
 * @param {RequestInit & { csrfToken?: string, timeoutMs?: number }} [options]
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const { csrfToken, responseType = 'json', headers = {}, body, timeoutMs, signal: externalSignal, ...customConfig } = options;

  const url = endpoint.startsWith('http') || endpoint.startsWith('/api')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const method = (customConfig.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);

  const reqHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  // Attach CSRF token on mutating requests if available
  const token = csrfToken || currentCsrfToken;
  if (isMutation && token) {
    reqHeaders['X-CSRF-Token'] = token;
  }

  const config = {
    method,
    credentials: 'include',
    headers: reqHeaders,
    body: body && typeof body === 'object' && !(body instanceof FormData) ? JSON.stringify(body) : body,
    ...customConfig,
  };

  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, timeoutMs ?? API_REQUEST_TIMEOUT_MS);
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener('abort', abort, { once: true });
  config.signal = controller.signal;
  // Ignore late 401s from a previous session after another login/logout.
  const requestSessionToken = currentCsrfToken;
  try {
    const response = await fetch(url, config);
    if (response.status === 204) return { data: null };
    if (response.ok && responseType === 'blob') return { blob: await response.blob(), headers: response.headers };
    let json = null;
    try {
      json = await response.json();
    } catch (err) {
      if (controller.signal.aborted) throw err;
      if (response.ok) {
        throw new ApiError({ status: 0, code: isMutation ? 'LOST_RESPONSE' : 'SERVICE_UNAVAILABLE', message: 'Invalid server response' });
      }
    }
    if (!response.ok) {
      const errorPayload = json?.error || {};
      const code = errorPayload.code || ((response.status === 502 || response.status === 504) ? 'LOST_RESPONSE' : 'UNKNOWN');
      if (response.status === 401 && requestSessionToken && requestSessionToken === currentCsrfToken) {
        notifyUnauthorized({ status: 401, code });
      }
      throw new ApiError({
        status: response.status, code,
        message: errorPayload.message || response.statusText || 'API Error',
        fieldErrors: errorPayload.fieldErrors || {},
        requestId: errorPayload.requestId || response.headers.get('x-request-id') || null,
        details: errorPayload.details || {},
      });
    }
    if (!json || typeof json !== 'object') {
      throw new ApiError({ status: 0, code: isMutation ? 'LOST_RESPONSE' : 'SERVICE_UNAVAILABLE', message: 'Invalid server response' });
    }
    return json;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (externalSignal?.aborted) throw err;
    throw new ApiError({
      status: 0,
      code: isMutation ? 'LOST_RESPONSE' : 'SERVICE_UNAVAILABLE',
      message: controller.signal.aborted ? 'Request timed out' : 'Unable to reach the server',
    });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abort);
  }

}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'DELETE', body }),
};

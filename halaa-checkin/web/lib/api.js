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

const API_BASE = '/api/checkin/v1';

/**
 * Core API fetch wrapper.
 * @param {string} endpoint e.g. '/auth/session' or '/events'
 * @param {RequestInit & { csrfToken?: string }} [options]
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const { csrfToken, headers = {}, body, ...customConfig } = options;

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

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError({
      status: 0,
      code: 'SERVICE_UNAVAILABLE',
      message: err.message || 'Network connection failed',
    });
  }

  // 204 No Content
  if (response.status === 204) {
    return { data: null };
  }

  let json = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const errorPayload = json?.error || {};
    throw new ApiError({
      status: response.status,
      code: errorPayload.code || 'UNKNOWN',
      message: errorPayload.message || response.statusText || 'API Error',
      fieldErrors: errorPayload.fieldErrors || {},
      requestId: errorPayload.requestId || response.headers.get('x-request-id') || null,
      details: errorPayload.details || {},
    });
  }

  return json;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'DELETE', body }),
};

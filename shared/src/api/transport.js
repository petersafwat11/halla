/**
 * Transport interface. Each app implements this once (web=axios, mobile=fetch).
 * Shared never instantiates it.
 *
 * @typedef {Object} TransportRequest
 * @property {"GET"|"POST"|"PATCH"|"PUT"|"DELETE"} method
 * @property {string} path                                  resolved from API_PATHS
 * @property {unknown|FormData} [body]
 * @property {Record<string, string|number|boolean>} [query]
 * @property {Record<string, string>} [headers]
 * @property {string} [idempotencyKey]
 * @property {number} [timeoutMs]
 * @property {AbortSignal} [signal]
 *
 * @typedef {Object} Transport
 * @property {<T>(opts: TransportRequest) => Promise<T>} request
 */

export {};

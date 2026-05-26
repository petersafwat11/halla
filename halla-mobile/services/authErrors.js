/**
 * Mobile auth error utilities.
 *
 * - `ApiError` preserves every structured field the backend returns
 *   (code, field, errors[], meta, otpErrorType, accountStatus,
 *   remainingMinutes, retryAfterSeconds) so screens can render
 *   field-level errors and i18n-mapped copy instead of dumping the
 *   backend's English `message` into a toast.
 *
 * - `postJson` / `requestJson` centralize fetch + JSON parsing + throw
 *   so every auth service function emits the same structured error
 *   shape. Network failures and timeouts are tagged with stable codes
 *   (`NETWORK_ERROR`, `TIMEOUT`) at the source.
 *
 * - `authErrorMessage` mirrors the web's `getAuthErrorMessage` and
 *   reads keys from the `auth` namespace under `authErrors.*`. The key
 *   set is intentionally identical to the web `common.json` block so
 *   both clients render the same copy.
 */

import { fetchWithTimeout } from "./apiClient";
import { API_BASE_URL } from "../config/api";

export class ApiError extends Error {
  constructor({
    message,
    status = 0,
    code = null,
    field = null,
    errors = null,
    meta = null,
    otpErrorType = null,
    accountStatus = null,
    remainingMinutes = null,
    retryAfterSeconds = null,
    cause = null,
  }) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
    this.errors = Array.isArray(errors) ? errors : null;
    this.meta = meta;
    this.otpErrorType = otpErrorType;
    this.accountStatus = accountStatus;
    this.remainingMinutes = remainingMinutes;
    this.retryAfterSeconds = retryAfterSeconds;
    if (cause) this.cause = cause;
  }
}

const fromResponseBody = (response, data) => {
  return new ApiError({
    message: data?.message || data?.error || `HTTP ${response.status}`,
    status: response.status,
    code: data?.code || null,
    field: data?.field || null,
    errors: data?.errors || null,
    meta: data?.meta || null,
    otpErrorType: data?.otpErrorType || null,
    accountStatus: data?.accountStatus || null,
    remainingMinutes: data?.remainingMinutes ?? null,
    retryAfterSeconds: data?.retryAfterSeconds ?? null,
  });
};

const fromTransport = (err) => {
  if (err && err.name === "TimeoutError") {
    return new ApiError({ message: "Request timed out", status: 0, code: "TIMEOUT", cause: err });
  }
  // fetch network failure surfaces as TypeError "Network request failed" on RN
  return new ApiError({
    message: "Network request failed",
    status: 0,
    code: "NETWORK_ERROR",
    cause: err,
  });
};

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
    throw fromTransport(err);
  }

  const data = await safeJson(response);

  if (!response.ok) {
    throw fromResponseBody(response, data || {});
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

/**
 * Resolve an `ApiError` (or any thrown value) to a user-facing message
 * via the `auth` namespace. Mirrors the web's `getAuthErrorMessage` —
 * lookup priority: OTP subtype → account status → lockout minutes →
 * code+field → token-expired family → code default → status fallback.
 */
export const authErrorMessage = (error, t) => {
  if (!error) return null;
  const prefix = "authErrors";
  const status = error.status ?? null;
  const code = error.code || null;
  const field = error.field || null;
  const otpErrorType = error.otpErrorType || null;
  const accountStatus = error.accountStatus || null;
  const remainingMinutes = error.remainingMinutes ?? null;
  const meta = error.meta || null;

  // 1) OTP subtypes
  if (code === "OTP_ERROR" && otpErrorType) {
    let key = `${prefix}.OTP_ERROR.${otpErrorType}`;
    let interp = {};
    if (otpErrorType === "cooldown" && meta?.waitSeconds) {
      key = `${prefix}.OTP_ERROR.cooldown_with_seconds`;
      interp = { seconds: meta.waitSeconds };
    } else if (otpErrorType === "invalid" && meta?.attemptsLeft > 0) {
      key = `${prefix}.OTP_ERROR.invalid_with_attempts`;
      interp = { attemptsLeft: meta.attemptsLeft };
    }
    const msg = t(key, { defaultValue: "", ...interp });
    if (msg) return { message: msg, type: "otp", field: null, code };
  }

  // 2) Account status
  if (code === "ACCOUNT_STATUS_ERROR" && accountStatus) {
    const msg = t(`${prefix}.ACCOUNT_STATUS_ERROR.${accountStatus}`, { defaultValue: "" });
    if (msg) return { message: msg, type: "account", field: null, code };
  }

  // 3) Account lockout with minutes
  if (code === "ACCOUNT_LOCKED" && remainingMinutes) {
    const msg = t(`${prefix}.ACCOUNT_LOCKED_WITH_MINUTES`, {
      defaultValue: "",
      minutes: remainingMinutes,
    });
    if (msg) return { message: msg, type: "account", field: null, code };
  }

  // 4) Code + field
  if (code && field) {
    const msg = t(`${prefix}.${code}.${field}`, { defaultValue: "" });
    if (msg) return { message: msg, type: code === "CONFLICT" || code === "DUPLICATE_FIELD" ? "duplicate" : "validation", field, code };
  }

  // 5) Token-expired family
  if (code === "TOKEN_INVALID_OR_EXPIRED" || code === "VERIFICATION_LINK_EXPIRED") {
    const msg = t(`${prefix}.${code}`, { defaultValue: "" });
    if (msg) return { message: msg, type: "token", field: null, code };
  }

  // 6) Code default / direct
  if (code) {
    const defaultMsg = t(`${prefix}.${code}.default`, { defaultValue: "" });
    const directMsg = t(`${prefix}.${code}`, { defaultValue: "" });
    const msg = defaultMsg || directMsg;
    if (msg && typeof msg === "string") {
      const isConflict = code === "CONFLICT" || code === "DUPLICATE_FIELD";
      return { message: msg, type: isConflict ? "duplicate" : "validation", field: field || null, code };
    }
  }

  // 7) Transport / status fallbacks
  if (code === "NETWORK_ERROR") {
    return { message: t(`${prefix}.NETWORK_ERROR`), type: "network", field: null, code };
  }
  if (code === "TIMEOUT") {
    return { message: t(`${prefix}.TIMEOUT`), type: "network", field: null, code };
  }
  if (status >= 500) {
    return { message: t(`${prefix}.SERVER`), type: "general", field: null, code };
  }
  if (status === 0) {
    return { message: t(`${prefix}.NETWORK`), type: "network", field: null, code };
  }

  return { message: t(`${prefix}.UNKNOWN`), type: "general", field: null, code };
};

export default { ApiError, requestJson, postJson, postForm, patchJson, authErrorMessage };

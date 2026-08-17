/**
 * Canonical ApiError — used by both web and mobile HTTP adapters.
 *
 * Carries the full structured payload the backend emits so screens can
 * render contextual messages (field-level errors, OTP retry counts,
 * lockout minutes, etc.) instead of dumping the English `message`.
 *
 * Created in two places: the axios interceptor on web and the fetch
 * wrapper on mobile. Both convert their transport-specific error shape
 * into this one shape before throwing.
 */
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
    reason = null,
    cause = null,
  } = {}) {
    super(message || code || "ApiError");
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
    this.reason = reason;
    if (cause) this.cause = cause;
  }

  /**
   * 410 Gone with a structured `reason` is the revoked-token signal —
   * both clients should call `logout({ reason })` and bail to login.
   */
  get isRevoked() {
    return this.status === 410 && Boolean(this.reason);
  }
}

/**
 * Build an ApiError from a parsed backend body. Both transport adapters
 * share this so the field-extraction logic stays in one place.
 *
 * @param {{ status: number, data: object|null }} response
 */
export const apiErrorFromResponse = ({ status, data }) => {
  const body = data || {};
  return new ApiError({
    message: body.message || body.error || `HTTP ${status}`,
    status,
    code: body.code || null,
    field: body.field || null,
    errors: body.errors || null,
    meta: body.meta || null,
    otpErrorType: body.otpErrorType || null,
    accountStatus: body.accountStatus || null,
    remainingMinutes: body.remainingMinutes ?? null,
    retryAfterSeconds: body.retryAfterSeconds ?? null,
    reason: body.reason || null,
  });
};

/**
 * Build an ApiError from a transport-level failure (timeout or network).
 *
 * @param {Error} err
 */
export const apiErrorFromTransport = (err) => {
  if (err && (err.name === "TimeoutError" || err.code === "ECONNABORTED")) {
    return new ApiError({
      message: "Request timed out",
      status: 0,
      code: "TIMEOUT",
      cause: err,
    });
  }
  return new ApiError({
    message: "Network request failed",
    status: 0,
    code: "NETWORK_ERROR",
    cause: err,
  });
};

export default ApiError;
